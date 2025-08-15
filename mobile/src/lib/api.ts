// Mock-first API with optional backend (via EXPO_PUBLIC_API_BASE_URL).
// Adds Applications + Chat creation on Apply.

import { useAuth } from "@src/store/useAuth";
import { io, Socket } from "socket.io-client";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

// ---- Types ----
export type Job = {
  id: number;
  title: string;
  site: string;
  when: string; // "10 Jul - 20 Oct"
  status: "open" | "in_progress" | "completed";
  location?: string;
  payRate?: string;
  description?: string;
  imageUri?: string;
  skills?: string[];
  lat?: number;
  lng?: number;
  ownerId?: number; // manager/contractor user id
};

export type CreateJobInput = {
  title: string;
  site: string;
  start: string;   // YYYY-MM-DD
  end: string;     // YYYY-MM-DD
  location: string;
  payRate?: string;
  description?: string;
  imageUri?: string;
  skills?: string[];
};
export type UpdateJobInput = Partial<Omit<Job, "id">>;

export type Chat = {
  id: number;
  title: string;
  jobId?: number;
  managerId?: number;
  workerId?: number;
  lastMessage?: string;
  lastTime?: string; // ISO
  memberIds?: number[];
};

export type Message = {
  id: number;
  chat_id: number;
  user_id?: number;
  username: string; // "system" for system events
  body: string;
  created_at: string; // ISO
};

export type Application = {
  id: number;
  jobId: number;
  chatId: number;
  workerId: number;
  managerId: number;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
};

// ---- Demo Data ----
let _jobs: Job[] = [
  {
    id: 1, title: "Brickwork at Riverside", site: "Riverside Estate",
    when: "10 Jul - 20 Oct", status: "open",
    location: "London", lat: 51.5074, lng: -0.1278,
    ownerId: 101, payRate: "£18/hr",
    imageUri: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80",
    skills: ["bricklaying", "CSCS card"]
  },
  {
    id: 2, title: "Roof repairs", site: "Hangleton Homemakers Ltd",
    when: "11 Nov - 20 Oct", status: "open",
    location: "Brighton, UK", lat: 50.8225, lng: -0.1372,
    ownerId: 102, payRate: "£20/hr",
    imageUri: "https://images.unsplash.com/photo-1483721310020-03333e577078?w=800&q=80",
    skills: ["working at height"]
  },
];

let _chats: Chat[] = [
  {
    id: 10,
    title: "Site A",
    workerId: 1,
    managerId: 101,
    memberIds: [1, 101],
    lastMessage: "Thanks, see you tomorrow!",
    lastTime: new Date().toISOString(),
  },
  {
    id: 11,
    title: "Supplier - Timber",
    workerId: 1,
    managerId: 102,
    memberIds: [1, 102],
    lastMessage: "Price list attached",
    lastTime: new Date().toISOString(),
  },
];

let _messages: Record<number, Message[]> = {
  10: [
    {
      id: 1,
      chat_id: 10,
      user_id: 1,
      username: "You",
      body: "All good?",
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      chat_id: 10,
      user_id: 101,
      username: "Foreman",
      body: "Thanks, see you tomorrow!",
      created_at: new Date().toISOString(),
    },
  ],
  11: [
    {
      id: 3,
      chat_id: 11,
      user_id: 102,
      username: "Supplier",
      body: "Price list attached",
      created_at: new Date().toISOString(),
    },
  ],
};

let _applications: Application[] = [];

// ---- Helpers ----
const headers = (token?: string) => ({
  "Content-Type": "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {})
});

function toWhen(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) =>
    d.toLocaleString("en-GB", { day: "2-digit", month: "short" });
  return `${fmt(s)} - ${fmt(e)}`;
}
const nextId = (arr: { id: number }[]) => Math.max(0, ...arr.map(a => a.id)) + 1;

// ---- Jobs ----
export async function listJobs(): Promise<Job[]> {
  if (API_BASE) {
    try {
      const r = await fetch(`${API_BASE}/jobs`);
      if (r.ok) return r.json();
    } catch {}
  }
  return Promise.resolve(_jobs.slice());
}

export async function listManagerJobs(ownerId?: number): Promise<Job[]> {
  const all = await listJobs();
  return ownerId ? all.filter(j => j.ownerId === ownerId) : all;
}

export async function createJob(input: CreateJobInput, token?: string, ownerId?: number): Promise<Job> {
  if (API_BASE) {
    try {
      const r = await fetch(`${API_BASE}/jobs`, { method: "POST", headers: headers(token), body: JSON.stringify(input) });
      if (r.ok) return r.json();
    } catch {}
  }
  const job: Job = {
    id: nextId(_jobs),
    title: input.title,
    site: input.site,
    when: toWhen(input.start, input.end),
    status: "open",
    location: input.location,
    lat: input.location?.toLowerCase().includes("brighton") ? 50.8225 : 51.5074,
    lng: input.location?.toLowerCase().includes("brighton") ? -0.1372 : -0.1278,
    ownerId: ownerId ?? 999,
    payRate: input.payRate,
    description: input.description,
    imageUri: input.imageUri,
    skills: input.skills ?? []
  };
  _jobs = [job, ..._jobs];
  return Promise.resolve(job);
}

export async function updateJob(id: number, changes: UpdateJobInput, token?: string): Promise<Job> {
  if (API_BASE) {
    try {
      const r = await fetch(`${API_BASE}/jobs/${id}`, { method: "PATCH", headers: headers(token), body: JSON.stringify(changes) });
      if (r.ok) return r.json();
    } catch {}
  }
  const idx = _jobs.findIndex(j => j.id === id);
  if (idx < 0) throw new Error("Job not found");
  _jobs[idx] = { ..._jobs[idx], ...changes };
  return Promise.resolve(_jobs[idx]);
}

export async function deleteJob(id: number, token?: string): Promise<void> {
  if (API_BASE) {
    try { const r = await fetch(`${API_BASE}/jobs/${id}`, { method: "DELETE", headers: headers(token) }); if (r.ok) return; } catch {}
  }
  _jobs = _jobs.filter(j => j.id !== id);
}

export async function listJobLocations() {
  const jobs = await listJobs();
  return jobs.map(j => ({
    id: j.id, title: j.title, site: j.site,
    coords: { latitude: j.lat ?? 53.8, longitude: j.lng ?? -1.5 }
  }));
}

// ---- Applications + Chats ----
export async function listChats(userId?: number): Promise<Chat[]> {
  if (API_BASE) {
    try {
      const token = useAuth.getState().token;
      if (token) {
        const r = await fetch(`${API_BASE}/chats`, { headers: headers(token) });
        if (r.ok) return r.json();
      }
    } catch {}
  }
  // If userId provided, filter to chats the user participates in.
  if (userId == null) return Promise.resolve(_chats.slice());
  return Promise.resolve(
    _chats.filter(c => c.workerId === userId || c.managerId === userId).slice()
  );
}

export async function getChat(chatId: number): Promise<Chat | undefined> {
  if (API_BASE) {
    const chats = await listChats();
    return chats.find(c => c.id === chatId);
  }
  return Promise.resolve(_chats.find(c => c.id === chatId));
}

export async function listMessages(chatId: number): Promise<Message[]> {
  if (API_BASE) {
    try {
      const token = useAuth.getState().token;
      if (token) {
        const r = await fetch(`${API_BASE}/chats/${chatId}/messages`, { headers: headers(token) });
        if (r.ok) return r.json();
      }
    } catch {}
  }
  return Promise.resolve(_messages[chatId] ? _messages[chatId].slice() : []);
}

export async function sendMessage(chatId: number, body: string, username = "You"): Promise<Message> {
  if (API_BASE) {
    try {
      const token = useAuth.getState().token;
      if (token) {
        const r = await fetch(`${API_BASE}/chats/${chatId}/messages`, {
          method: "POST",
          headers: headers(token),
          body: JSON.stringify({ body })
        });
        if (r.ok) return r.json();
      }
    } catch {}
  }
  const msg: Message = {
    id: nextId(_messages[chatId] || []),
    chat_id: chatId,
    user_id: useAuth.getState().user?.id ?? 0,
    username,
    body,
    created_at: new Date().toISOString(),
  };
  _messages[chatId] = [...(_messages[chatId] || []), msg];
  const c = _chats.find(x => x.id === chatId);
  if (c) { c.lastMessage = body; c.lastTime = msg.created_at; }
  return Promise.resolve(msg);
}

export async function applyToJob(jobId: number, workerId: number, workerName?: string): Promise<{ chatId: number }> {
  const job = _jobs.find(j => j.id === jobId);
  if (!job) throw new Error("Job not found");
  const managerId = job.ownerId ?? 999;

  if (API_BASE) {
    try {
      const token = useAuth.getState().token;
      if (token) {
        const r = await fetch(`${API_BASE}/chats`, {
          method: "POST",
          headers: headers(token),
          body: JSON.stringify({
            title: `Job: ${job.title}`,
            memberIds: [workerId, managerId]
          })
        });
        if (r.ok) {
          const chat = await r.json();
          const appRes = await fetch(`${API_BASE}/applications`, {
            method: "POST",
            headers: headers(token),
            body: JSON.stringify({ projectId: jobId, chatId: chat.id, workerId, managerId })
          });
          const app = appRes.ok ? await appRes.json() : null;
          if (!app) throw new Error("Failed to create application");
          await sendMessage(chat.id, `${workerName || "Worker"} applied to this job`);
          return { chatId: chat.id };
        }
      }
    } catch {}
  }

  // Existing chat?
  let chat = _chats.find(c => c.jobId === jobId && c.workerId === workerId);
  if (!chat) {
    chat = {
      id: nextId(_chats),
      title: `Job: ${job.title}`,
      jobId,
      managerId,
      workerId,
      memberIds: [workerId, managerId],
      lastMessage: "Application sent",
      lastTime: new Date().toISOString(),
    };
    _chats = [chat, ..._chats];
  }

  // Application (one per worker per job)
  let app = _applications.find(a => a.chatId === chat!.id);
  if (!app) {
    app = {
      id: nextId(_applications),
      jobId, chatId: chat.id, workerId, managerId,
      status: "pending",
      createdAt: new Date().toISOString()
    };
    _applications = [app, ..._applications];
  } else {
    app.status = "pending";
  }

  // System message
  await sendMessage(chat.id, `${workerName || "Worker"} applied to this job`, "system");

  return { chatId: chat.id };
}

export async function getApplicationForChat(chatId: number): Promise<Application | undefined> {
  if (API_BASE) {
    try {
      const token = useAuth.getState().token;
      if (token) {
        const r = await fetch(`${API_BASE}/applications/by-chat/${chatId}`, { headers: headers(token) });
        if (r.ok) {
          const app = await r.json();
          if (app) {
            return {
              id: app.id,
              jobId: app.project_id,
              chatId: app.chat_id,
              workerId: app.worker_id,
              managerId: app.manager_id,
              status: app.status,
              createdAt: app.created_at,
            } as Application;
          }
          return undefined;
        }
      }
    } catch {}
  }
  return Promise.resolve(_applications.find(a => a.chatId === chatId));
}

export async function setApplicationStatus(chatId: number, status: "accepted" | "declined"): Promise<Application> {
  const managerName = useAuth.getState().user?.username;
  if (API_BASE) {
    try {
      const token = useAuth.getState().token;
      if (token) {
        const r = await fetch(`${API_BASE}/applications/by-chat/${chatId}`, {
          method: "PATCH",
          headers: headers(token),
          body: JSON.stringify({ status })
        });
        if (r.ok) {
          const app = await r.json();
          return {
            id: app.id,
            jobId: app.project_id,
            chatId: app.chat_id,
            workerId: app.worker_id,
            managerId: app.manager_id,
            status: app.status,
            createdAt: app.created_at,
          } as Application;
        }
      }
    } catch {}
  }
  const app = _applications.find(a => a.chatId === chatId);
  if (!app) throw new Error("Application not found");
  app.status = status;
  await sendMessage(chatId, `${managerName || "Manager"} ${status} the application`, "system");
  return Promise.resolve(app);
}

// ---- Stubs kept for compatibility ----
let _socket: Socket | null = null;
export function getSocket(): Socket | null {
  if (!API_BASE) return null;
  if (!_socket) {
    const token = useAuth.getState().token;
    _socket = io(API_BASE, token ? { auth: { token } } : undefined);
  }
  return _socket;
}

// ---- Demo-only Team/Projects (kept for other screens) ----
let _projects = [
  { id: 101, title: "Extension and refurb", site: "Hangleton Homemakers Ltd", when: "10 Jul - 20 Oct", status: "in_progress", budget: 15000 },
  { id: 102, title: "Landscaping and Summer house", site: "Garden & Landscaping Ltd", when: "11 Nov - 20 Oct", status: "open", budget: 8000 }
];
export async function listProjects() {
  if (API_BASE) {
    const token = useAuth.getState().token;
    const r = await fetch(`${API_BASE}/projects`, { headers: headers(token ?? undefined) });
    if (!r.ok) throw new Error("Failed to fetch projects");
    return r.json();
  }
  return Promise.resolve(_projects.slice());
}
export async function createProject(p: { title: string; site: string; when: string; status?: string; budget?: number }) {
  if (API_BASE) {
    const token = useAuth.getState().token;
    const r = await fetch(`${API_BASE}/projects`, {
      method: "POST",
      headers: headers(token ?? undefined),
      body: JSON.stringify(p),
    });
    if (!r.ok) throw new Error("Failed to create project");
    return r.json();
  }
  const proj = { id: nextId(_projects), budget: 0, status: "open", ...p } as any;
  _projects.push(proj);
  return Promise.resolve(proj);
}
export async function listTeam() { return Promise.resolve([{ id: 1, name: "Sam Carter", role: "Site Supervisor", status: "online" }]); }
