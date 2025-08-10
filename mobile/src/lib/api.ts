// Central API with graceful fallback to local demo data.
// If EXPO_PUBLIC_API_BASE_URL is set, we try the backend first.
// If requests fail, we fall back to in-memory data so the demo keeps working.

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

  // For map pins
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

// ---- Demo Data ----
let _jobs: Job[] = [
  {
    id: 1,
    title: "Brickwork at Riverside",
    site: "Riverside Estate",
    when: "10 Jul - 20 Oct",
    status: "open",
    location: "London",
    lat: 51.5074,
    lng: -0.1278,
    ownerId: 101,
    payRate: "£18/hr",
    imageUri: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80",
    skills: ["bricklaying", "CSCS card"]
  },
  {
    id: 2,
    title: "Roof repairs",
    site: "Hangleton Homemakers Ltd",
    when: "11 Nov - 20 Oct",
    status: "open",
    location: "Brighton, UK",
    lat: 50.8225,
    lng: -0.1372,
    ownerId: 102,
    payRate: "£20/hr",
    imageUri: "https://images.unsplash.com/photo-1483721310020-03333e577078?w=800&q=80",
    skills: ["working at height"]
  },
];

let _projects = [
  { id: 101, title: "Extension and refurb", site: "Hangleton Homemakers Ltd", when: "10 Jul - 20 Oct", status: "in_progress" },
  { id: 102, title: "Landscaping and Summer house", site: "Garden & Landscaping Ltd", when: "11 Nov - 20 Oct", status: "open" }
];

let _team = [
  { id: 1, name: "Sam Carter", role: "Site Supervisor", status: "online" },
  { id: 2, name: "Alex Grant", role: "Electrician", status: "offline" },
  { id: 3, name: "Maya Khan", role: "Plumber", status: "online" }
];

let _chats = [
  { id: 10, title: "Site A", lastMessage: "Thanks, see you tomorrow!", lastTime: "12:04" },
  { id: 11, title: "Supplier - Timber", lastMessage: "Price list attached", lastTime: "Yesterday" }
];

let _messages: Record<number, any[]> = {
  10: [
    { id: 1, chat_id: 10, username: "You", body: "All good?", created_at: new Date().toISOString() },
    { id: 2, chat_id: 10, username: "Foreman", body: "Thanks, see you tomorrow!", created_at: new Date().toISOString() },
  ],
  11: [{ id: 3, chat_id: 11, username: "Supplier", body: "Price list attached", created_at: new Date().toISOString() }]
};

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

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  london:    { lat: 51.5074, lng: -0.1278 },
  brighton:  { lat: 50.8225, lng: -0.1372 },
  manchester:{ lat: 53.4808, lng: -2.2426 },
  birmingham:{ lat: 52.4862, lng: -1.8904 },
  leeds:     { lat: 53.8008, lng: -1.5491 },
  bristol:   { lat: 51.4545, lng: -2.5879 },
  glasgow:   { lat: 55.8642, lng: -4.2518 },
  liverpool: { lat: 53.4084, lng: -2.9916 },
  newcastle: { lat: 54.9783, lng: -1.6178 },
  sheffield: { lat: 53.3811, lng: -1.4701 },
};

function coordsFor(location: string | undefined): { lat: number; lng: number } {
  const loc = (location || "United Kingdom").toLowerCase();
  const known = Object.keys(CITY_COORDS).find(k => loc.includes(k));
  if (known) {
    const base = CITY_COORDS[known];
    let h = 0; for (let i = 0; i < loc.length; i++) h = (h * 31 + loc.charCodeAt(i)) | 0;
    const jlat = ((h % 100) / 100) * 0.02 - 0.01;
    const jlng = (((h >> 3) % 100) / 100) * 0.02 - 0.01;
    return { lat: base.lat + jlat, lng: base.lng + jlng };
  }
  let h = 0; for (let i = 0; i < loc.length; i++) h = (h * 33 + loc.charCodeAt(i)) | 0;
  const baseLat = 53.8, baseLng = -1.5;
  const deltaLat = ((h % 1000) / 1000) * 1 - 0.5;
  const deltaLng = (((h >> 4) % 1000) / 1000) * 1 - 0.5;
  return { lat: baseLat + deltaLat, lng: baseLng + deltaLng };
}

// ---- Jobs (shared) ----
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
      const r = await fetch(`${API_BASE}/jobs`, {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(input)
      });
      if (r.ok) return r.json();
    } catch {}
  }
  const id = Math.max(0, ..._jobs.map(j => j.id)) + 1;
  const when = toWhen(input.start, input.end);
  const { lat, lng } = coordsFor(input.location);
  const job: Job = {
    id,
    title: input.title,
    site: input.site,
    when,
    status: "open",
    location: input.location,
    lat, lng,
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
      const r = await fetch(`${API_BASE}/jobs/${id}`, {
        method: "PATCH",
        headers: headers(token),
        body: JSON.stringify(changes)
      });
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
    try {
      const r = await fetch(`${API_BASE}/jobs/${id}`, { method: "DELETE", headers: headers(token) });
      if (r.ok) return;
    } catch {}
  }
  _jobs = _jobs.filter(j => j.id !== id);
}

export async function listJobLocations() {
  const jobs = await listJobs();
  return jobs.map(j => {
    const { lat, lng } = (j.lat != null && j.lng != null) ? { lat: j.lat, lng: j.lng } : coordsFor(j.location);
    return { id: j.id, title: j.title, site: j.site, coords: { latitude: lat, longitude: lng } };
  });
}

// ---- Team / Projects / Chat (demo) ----
export async function listTeam() { return Promise.resolve(_team.slice()); }
export async function listProjects() { return Promise.resolve(_projects.slice()); }
export async function listChats() { return Promise.resolve(_chats.slice()); }
export async function listMessages(chatId: number) { return Promise.resolve(_messages[chatId] ? _messages[chatId].slice() : []); }
export async function sendMessage(chatId: number, body: string) {
  const msg = { id: Math.max(0, ...(_messages[chatId] || []).map((m) => m.id)) + 1, chat_id: chatId, username: "You", body, created_at: new Date().toISOString() };
  _messages[chatId] = [...(_messages[chatId] || []), msg];
  return Promise.resolve(msg);
}
