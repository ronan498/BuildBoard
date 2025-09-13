// Mock-first API with optional backend (via EXPO_PUBLIC_API_BASE_URL).
// Adds Applications + Chat creation on Apply.

import { useAuth } from "@src/store/useAuth";
import type { Profile } from "@src/store/useProfile";
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
  isPrivate: boolean;
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
  isPrivate: boolean;
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

export type ConnectionUser = {
  id: number;
  username: string;
  email: string;
  role: string;
  avatarUri?: string;
};

export type ConnectionRequest = {
  id: number;
  user: ConnectionUser;
};

// ---- Demo Data ----
let _jobs: Job[] = [
  {
    id: 1, title: "Brickwork at Riverside", site: "Riverside Estate",
    when: "10 Jul - 20 Oct", status: "open",
    location: "London", lat: 51.5074, lng: -0.1278,
    ownerId: 101, payRate: "£18/hr",
    imageUri: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80",
    skills: ["bricklaying", "CSCS card"],
    isPrivate: false,
  },
  {
    id: 2, title: "Roof repairs", site: "Hangleton Homemakers Ltd",
    when: "11 Nov - 20 Oct", status: "open",
    location: "Brighton, UK", lat: 50.8225, lng: -0.1372,
    ownerId: 102, payRate: "£20/hr",
    skills: ["working at height"],
    isPrivate: false,
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

let _aiMessages: Message[] = [];

let _applications: Application[] = [];

let _connections: ConnectionUser[] = [];
let _connectionRequests: ConnectionRequest[] = [];

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
export async function listJobs(ownerId?: number): Promise<Job[]> {
  if (API_BASE) {
    try {
      const url = `${API_BASE}/jobs${ownerId ? `?ownerId=${ownerId}` : ""}`;
      const r = await fetch(url);
      if (r.ok) {
        const jobs: Job[] = await r.json();
        return ownerId ? jobs : jobs.filter(j => !j.isPrivate);
      }
    } catch {}
  }
  const jobs = _jobs.slice();
  return ownerId ? jobs : jobs.filter(j => !j.isPrivate);
}

export async function listManagerJobs(ownerId?: number): Promise<Job[]> {
  const all = await listJobs(ownerId);
  return ownerId ? all.filter(j => j.ownerId === ownerId) : all;
}

export async function createJob(input: CreateJobInput, token?: string, ownerId?: number): Promise<Job> {
  if (API_BASE) {
    // send job details first (without imageUri)
    const { imageUri, ...jobData } = input as any;
    const r = await fetch(`${API_BASE}/jobs`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify(jobData)
    });
    if (!r.ok) {
      throw new Error(`Failed to create job (${r.status})`);
    }
    const job: Job = await r.json();

    // if a local image was provided, upload it
    if (job.id && imageUri) {
      const form = new FormData();
      const name = imageUri.split("/").pop() || "photo.jpg";
      const match = /\.([a-zA-Z0-9]+)$/.exec(name);
      const type = match ? `image/${match[1]}` : "image";
      form.append("file", { uri: imageUri, name, type } as any);
      const upload = await fetch(`${API_BASE}/jobs/${job.id}/image`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form
      });
      if (!upload.ok) {
        throw new Error(`Image upload failed (${upload.status})`);
      }
      const { url } = await upload.json();
      job.imageUri = url;
    }

    return job;
  }

  const startDate = new Date(input.start);
  const endDate = new Date(input.end);
  const today = new Date();
  today.setHours(0,0,0,0);
  if (startDate < today || endDate < today || endDate < startDate) {
    throw new Error("Invalid job dates");
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
    skills: input.skills ?? [],
    isPrivate: input.isPrivate,
  };
  _jobs = [job, ..._jobs];
  return Promise.resolve(job);
}

export async function updateJob(id: number, changes: UpdateJobInput, token?: string): Promise<Job> {
  if (API_BASE) {
    const { imageUri, ...rest } = changes as any;
    try {
      const r = await fetch(`${API_BASE}/jobs/${id}`, { method: "PATCH", headers: headers(token), body: JSON.stringify(rest) });
      if (!r.ok) throw new Error();
      let job: Job = await r.json();

      if (imageUri && imageUri.startsWith("file://")) {
        const form = new FormData();
        const name = imageUri.split("/").pop() || "photo.jpg";
        const match = /\.([a-zA-Z0-9]+)$/.exec(name);
        const type = match ? `image/${match[1]}` : "image";
        form.append("file", { uri: imageUri, name, type } as any);
        const upload = await fetch(`${API_BASE}/jobs/${id}/image`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: form
        });
        if (!upload.ok) throw new Error();
        const { url } = await upload.json();
        job.imageUri = url;
      }
      return job;
    } catch {}
  }
  const idx = _jobs.findIndex(j => j.id === id);
  if (idx < 0) throw new Error("Job not found");
  _jobs[idx] = { ..._jobs[idx], ...changes };
  return Promise.resolve(_jobs[idx]);
}

export async function deleteJob(id: number, token?: string): Promise<void> {
  if (API_BASE) {
    const auth = token ?? useAuth.getState().token;
    const r = await fetch(`${API_BASE}/jobs/${id}`, {
      method: "DELETE",
      headers: headers(auth ?? undefined),
    });
    if (!r.ok) throw new Error(`Failed to delete job (${r.status})`);
    return;
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

export async function listJobWorkers(jobId: number): Promise<{ id: number; name: string; avatarUri?: string }[]> {
  const token = useAuth.getState().token;
  if (API_BASE && token) {
    try {
      const r = await fetch(`${API_BASE}/jobs/${jobId}/workers`, {
        headers: headers(token),
      });
      if (r.ok) {
        const workers = await r.json();
        return workers.map((w: any) => ({ id: w.id, name: w.username, avatarUri: w.avatarUri }));
      }
    } catch {}
  }
  return [];
}

// ---- Applications + Chats ----
export async function listChats(userId?: number): Promise<Chat[]> {
  const role = useAuth.getState().role;
  const token = useAuth.getState().token;

  if (API_BASE && token) {
    try {
      const r = await fetch(`${API_BASE}/chats`, { headers: headers(token) });
      const chats: Chat[] = r.ok ? await r.json() : [];
      if (role === "labourer" || role === "manager") {
        let lastMessage: string | undefined;
        let lastTime: string | undefined;
        try {
          const r2 = await fetch(`${API_BASE}/ai/messages`, { headers: headers(token) });
          if (r2.ok) {
            const msgs: Message[] = await r2.json();
            const last = msgs[msgs.length - 1];
            if (last) {
              lastMessage = last.body;
              lastTime = last.created_at;
            }
          }
        } catch {}
        chats.unshift({ id: 0, title: "Construction AI", memberIds: [userId ?? 0], lastMessage, lastTime });
      }
      return chats;
    } catch {}
  }

  // mock fallback
  let res = _chats.slice();
  if (userId != null) res = res.filter(c => c.workerId === userId || c.managerId === userId);
  if (role === "labourer" || role === "manager") {
    const last = _aiMessages[_aiMessages.length - 1];
    res.unshift({ id: 0, title: "Construction AI", memberIds: [userId ?? 0], lastMessage: last?.body, lastTime: last?.created_at });
  }
  return Promise.resolve(res);
}

export async function getChat(chatId: number): Promise<Chat | undefined> {
  if (chatId === 0) {
    const uid = useAuth.getState().user?.id ?? 0;
    return Promise.resolve({ id: 0, title: "Construction AI", memberIds: [uid] });
  }
  if (API_BASE) {
    const chats = await listChats();
    return chats.find(c => c.id === chatId);
  }
  return Promise.resolve(_chats.find(c => c.id === chatId));
}

export async function listMessages(chatId: number): Promise<Message[]> {
  const token = useAuth.getState().token;
  if (chatId === 0) {
    if (API_BASE && token) {
      try {
        const r = await fetch(`${API_BASE}/ai/messages`, { headers: headers(token) });
        if (r.ok) return r.json();
      } catch {}
    }
    return Promise.resolve(_aiMessages.slice());
  }

  if (API_BASE && token) {
    try {
      const r = await fetch(`${API_BASE}/chats/${chatId}/messages`, { headers: headers(token) });
      if (r.ok) return r.json();
    } catch {}
  }
  return Promise.resolve(_messages[chatId] ? _messages[chatId].slice() : []);
}

export async function sendMessage(chatId: number, body: string, username = "You"): Promise<Message> {
  const token = useAuth.getState().token;
  if (chatId === 0) {
    if (API_BASE && token) {
      try {
        const r = await fetch(`${API_BASE}/ai/messages`, {
          method: "POST",
          headers: headers(token),
          body: JSON.stringify({ body })
        });
        if (r.ok) return r.json();
      } catch {}
      throw new Error("Failed to send");
    }
    const userMsg: Message = {
      id: nextId(_aiMessages),
      chat_id: 0,
      user_id: useAuth.getState().user?.id ?? 0,
      username,
      body,
      created_at: new Date().toISOString(),
    };
    const aiMsg: Message = {
      id: userMsg.id + 1,
      chat_id: 0,
      user_id: 0,
      username: "Construction AI",
      body: "...",
      created_at: new Date().toISOString(),
    };
    _aiMessages.push(userMsg, aiMsg);
    return Promise.resolve(aiMsg);
  }

  if (API_BASE && token) {
    try {
      const r = await fetch(`${API_BASE}/chats/${chatId}/messages`, {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify({ body })
      });
      if (r.ok) return r.json();
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

export async function deleteChat(chatId: number): Promise<void> {
  const token = useAuth.getState().token;
  if (chatId === 0) {
    if (API_BASE && token) {
      try {
        await fetch(`${API_BASE}/ai/messages`, { method: "DELETE", headers: headers(token) });
      } catch {}
    }
    _aiMessages = [];
    return;
  }
  if (API_BASE && token) {
    try {
      await fetch(`${API_BASE}/chats/${chatId}`, {
        method: "DELETE",
        headers: headers(token),
      });
    } catch {}
  }
  _chats = _chats.filter((c) => c.id !== chatId);
  delete _messages[chatId];
  _applications = _applications.filter((a) => a.chatId !== chatId);
}

export async function applyToJob(jobId: number, workerId: number, workerName?: string): Promise<{ chatId: number }> {
  let job = _jobs.find(j => j.id === jobId);
  if (API_BASE && !job) {
    try {
      const token = useAuth.getState().token;
      const r = await fetch(`${API_BASE}/jobs/${jobId}`, { headers: headers(token ?? undefined) });
      if (r.ok) job = await r.json();
    } catch {}
  }
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
          await fetch(`${API_BASE}/applications`, {
            method: "POST",
            headers: headers(token),
            body: JSON.stringify({ jobId, chatId: chat.id, workerId, managerId })
          });
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
              jobId: app.job_id,
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
            jobId: app.job_id,
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
  await sendMessage(chatId, `Manager ${status} the application`, "system");
  return Promise.resolve(app);
}

// ---- Profiles ----
export async function fetchProfile(userId: number, token?: string): Promise<Profile | null> {
  if (API_BASE) {
    try {
      const r = await fetch(`${API_BASE}/profiles/${userId}`, { headers: headers(token) });
      if (r.ok) return r.json();
    } catch {}
  }
  return null;
}

export async function uploadAvatar(userId: number, uri: string, token?: string): Promise<string> {
  if (!API_BASE) throw new Error("No API configured");
  const form = new FormData();
  const name = uri.split("/").pop() || "photo.jpg";
  const match = /\.([a-zA-Z0-9]+)$/.exec(name);
  const type = match ? `image/${match[1]}` : "image";
  form.append("file", { uri, name, type } as any);
  const r = await fetch(`${API_BASE}/profiles/${userId}/avatar`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  if (!r.ok) throw new Error(`Avatar upload failed (${r.status})`);
  const { url } = await r.json();
  return url;
}

export async function uploadBanner(userId: number, uri: string, token?: string): Promise<string> {
  if (!API_BASE) throw new Error("No API configured");
  const form = new FormData();
  const name = uri.split("/").pop() || "photo.jpg";
  const match = /\.([a-zA-Z0-9]+)$/.exec(name);
  const type = match ? `image/${match[1]}` : "image";
  form.append("file", { uri, name, type } as any);
  const r = await fetch(`${API_BASE}/profiles/${userId}/banner`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  if (!r.ok) throw new Error(`Banner upload failed (${r.status})`);
  const { url } = await r.json();
  return url;
}

export async function saveProfile(profile: Profile, token?: string): Promise<void> {
  if (API_BASE) {
    try {
      const clean: any = { ...profile };
      if (clean.avatarUri) clean.avatarUri = clean.avatarUri.split("?")[0];
      if (clean.bannerUri) clean.bannerUri = clean.bannerUri.split("?")[0];
      await fetch(`${API_BASE}/profiles/${profile.userId}`, {
        method: "PUT",
        headers: headers(token),
        body: JSON.stringify(clean),
      });
    } catch {}
  }
}

// ---- Connections ----
export async function listConnections(): Promise<ConnectionUser[]> {
  const token = useAuth.getState().token;
  if (API_BASE && token) {
    try {
      const r = await fetch(`${API_BASE}/connections`, { headers: headers(token) });
      if (r.ok) return await r.json();
    } catch {}
  }
  return _connections.slice();
}

export async function listConnectionRequests(): Promise<ConnectionRequest[]> {
  const token = useAuth.getState().token;
  if (API_BASE && token) {
    try {
      const r = await fetch(`${API_BASE}/connections/requests`, {
        headers: headers(token),
      });
      if (r.ok) return await r.json();
    } catch {}
  }
  return _connectionRequests.slice();
}

export async function sendConnectionRequest(
  email: string
): Promise<{ ok: boolean; error?: string }> {
  const token = useAuth.getState().token;
  if (API_BASE && token) {
    try {
      const r = await fetch(`${API_BASE}/connections/request`, {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify({ email }),
      });
      if (r.ok) return { ok: true };
      let msg = "Error sending request";
      let text = "";
      try {
        text = await r.text();
      } catch {}
      if (text) {
        try {
          const data = JSON.parse(text);
          msg = data.error || data.message || msg;
        } catch {
          msg = text;
        }
      } else if (r.status === 404) {
        msg = "User not found";
      } else if (r.statusText) {
        msg = r.statusText;
      }
      return { ok: false, error: msg };
    } catch {
      return { ok: false, error: "Network error" };
    }
  }
  const fakeUser: ConnectionUser = {
    id: nextId(_connections),
    username: email,
    email,
    role: "manager",
  };
  _connectionRequests.push({ id: nextId(_connectionRequests), user: fakeUser });
  return { ok: true };
}

export async function deleteConnection(id: number): Promise<void> {
  const token = useAuth.getState().token;
  if (API_BASE && token) {
    await fetch(`${API_BASE}/connections/${id}`, {
      method: "DELETE",
      headers: headers(token),
    }).catch(() => {});
    return;
  }
  const idx = _connections.findIndex((c) => c.id === id);
  if (idx >= 0) _connections.splice(idx, 1);
}

export async function respondConnectionRequest(id: number, accept: boolean): Promise<void> {
  const token = useAuth.getState().token;
  if (API_BASE && token) {
    await fetch(`${API_BASE}/connections/requests/${id}/respond`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({ accept }),
    }).catch(() => {});
    return;
  }
  const idx = _connectionRequests.findIndex((r) => r.id === id);
  if (idx >= 0) {
    const req = _connectionRequests.splice(idx, 1)[0];
    if (accept) _connections.push(req.user);
  }
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
export async function listTeam() {
  return Promise.resolve([
    { id: 1, name: "Sam Carter", role: "Site Supervisor", status: "online" }
  ]);
}
