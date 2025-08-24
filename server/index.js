const express = require("express");
const http = require("http");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Server } = require("socket.io");
const Database = require("better-sqlite3");
const path = require("path");
const multer = require("multer");
const OpenAI = require("openai");
const {
  BlobServiceClient,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
} = require("@azure/storage-blob");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- file upload setup
const upload = multer({ storage: multer.memoryStorage() });
let blobService;
let jobContainer;
let userContainer;
if (process.env.AZURE_STORAGE_CONNECTION_STRING) {
  blobService = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING
  );
  jobContainer = blobService.getContainerClient("jobimages");
  userContainer = blobService.getContainerClient("user-images");
} else {
  console.warn("AZURE_STORAGE_CONNECTION_STRING not set; uploads disabled");
}

const blobNameFromUrl = (url) => {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.pathname.split("/").pop();
  } catch {
    return null;
  }
};

const sasUrl = (container, blobName) => {
  const expiresOn = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
  const sas = generateBlobSASQueryParameters(
    {
      containerName: container.containerName,
      blobName,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn,
    },
    blobService.credential
  ).toString();
  return `${container.getBlockBlobClient(blobName).url}?${sas}`;
};

const googleSearch = async (query) => {
  const { GOOGLE_API_KEY, GOOGLE_CX } = process.env;
  if (!GOOGLE_API_KEY || !GOOGLE_CX) return null;
  try {
    const url =
      `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const data = await r.json();
    if (!Array.isArray(data.items)) return null;
    return data.items
      .slice(0, 3)
      .map((i) => `${i.title}: ${i.link}`)
      .join("\n");
  } catch (e) {
    console.error(e);
    return null;
  }
};

// --- DB setup (SQLite)
const dbPath = process.env.DB_PATH || path.join(__dirname, "buildboard.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

// tables
db.prepare(`CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS profiles(
  user_id INTEGER PRIMARY KEY,
  data TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS chats(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS chat_members(
  chat_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  PRIMARY KEY (chat_id, user_id)
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS messages(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS ai_messages(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS projects(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  site TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  status TEXT NOT NULL,
  budget INTEGER DEFAULT 0
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS project_workers(
  project_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  PRIMARY KEY (project_id, user_id)
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS applications(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  chat_id INTEGER NOT NULL,
  worker_id INTEGER NOT NULL,
  manager_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS jobs(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  site TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  status TEXT NOT NULL,
  location TEXT,
  pay_rate TEXT,
  description TEXT,
  image_uri TEXT,
  skills TEXT,
  lat REAL,
  lng REAL,
  owner_id INTEGER
)`).run();

// ensure system user exists for system messages
db.prepare(
  "INSERT OR IGNORE INTO users (id, email, username, password_hash, role) VALUES (0, 'system@buildboard.local', 'system', '', 'system')"
).run();

// // seed demo data (idempotent)
// const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
// if (userCount === 0) {
//   const hash = (p) => bcrypt.hashSync(p, 8);
//   const insertUser = db.prepare("INSERT INTO users (email, username, password_hash, role) VALUES (?, ?, ?, ?)");
//   const u1 = insertUser.run("worker@demo.com", "Worker", hash("demo1234"), "labourer").lastInsertRowid;
//   const u2 = insertUser.run("manager@demo.com", "Manager", hash("demo1234"), "manager").lastInsertRowid;
//   const u3 = insertUser.run("client@demo.com", "Client", hash("demo1234"), "client").lastInsertRowid;

//   const chatId = db.prepare("INSERT INTO chats (title) VALUES (?)").run("Site Thread").lastInsertRowid;
//   const addMem = db.prepare("INSERT OR IGNORE INTO chat_members (chat_id, user_id) VALUES (?, ?)");
//   [u1, u2, u3].forEach(uid => addMem.run(chatId, uid));

//   const addMsg = db.prepare("INSERT INTO messages (chat_id, user_id, body) VALUES (?, ?, ?)");
//   addMsg.run(chatId, u2, "Morning team, deliveries by 10am.");
//   addMsg.run(chatId, u1, "Copy that, will be on site at 8.");
//   addMsg.run(chatId, u3, "Please share progress photos later.");
//   console.log("Seeded demo users (password 'demo1234') and a chat.");
// }

// const projectCount = db.prepare("SELECT COUNT(*) as c FROM projects").get().c;
// if (projectCount === 0) {
//   const insertProject = db.prepare("INSERT INTO projects (title, site, timeframe, status, budget) VALUES (?, ?, ?, ?, ?)");
//   insertProject.run("Extension and refurb", "Hangleton Homemakers Ltd", "10 Jul - 20 Oct", "in_progress", 15000);
//   insertProject.run("Landscaping and Summer house", "Garden & Landscaping Ltd", "11 Nov - 20 Oct", "open", 8000);
//   console.log("Seeded demo projects.");
// }

// const jobCount = db.prepare("SELECT COUNT(*) as c FROM jobs").get().c;
// if (jobCount === 0) {
//   const insertJob = db.prepare(`INSERT INTO jobs (title, site, timeframe, status, location, pay_rate, description, image_uri, skills, lat, lng, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
//   insertJob.run(
//     "Brickwork at Riverside",
//     "Riverside Estate",
//     "10 Jul - 20 Oct",
//     "open",
//     "London",
//     "£18/hr",
//     null,
//     null,
//     JSON.stringify(["bricklaying", "CSCS card"]),
//     51.5074,
//     -0.1278,
//     2
//   );
//   insertJob.run(
//     "Roof repairs",
//     "Hangleton Homemakers Ltd",
//     "11 Nov - 20 Oct",
//     "open",
//     "Brighton, UK",
//     "£20/hr",
//     null,
//     null,
//     JSON.stringify(["roofing", "working at heights"]),
//     50.8225,
//     -0.1372,
//     2
//   );
//   console.log("Seeded demo jobs.");
// }

// --- helpers
const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role, username: user.username }, JWT_SECRET, { expiresIn: "7d" });

const toWhen = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d) => d.toLocaleString("en-GB", { day: "2-digit", month: "short" });
  return `${fmt(s)} - ${fmt(e)}`;
};

const auth = (req, res, next) => {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// --- auth routes
app.post("/auth/register", (req, res) => {
  const { email, username, password, role = "labourer" } = req.body || {};
  if (!email || !username || !password) return res.status(400).json({ error: "Missing fields" });
  try {
    const hash = bcrypt.hashSync(password, 8);
    const id = db.prepare(
      "INSERT INTO users (email, username, password_hash, role) VALUES (?, ?, ?, ?)"
    ).run(email, username, hash, role).lastInsertRowid;
    const user = db.prepare("SELECT id, email, username, role FROM users WHERE id = ?").get(id);
    res.json({ user, token: signToken(user) });
  } catch (e) {
    res.status(400).json({ error: "Email already exists" });
  }
});

app.post("/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email || "");
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = bcrypt.compareSync(password || "", user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  const safe = { id: user.id, email: user.email, username: user.username, role: user.role };
  res.json({ user: safe, token: signToken(safe) });
});

app.get("/me", auth, (req, res) => {
  const u = db.prepare("SELECT id, email, username, role FROM users WHERE id = ?").get(req.user.sub);
  res.json({ user: u });
});

// --- profiles ---
app.get("/profiles/:id", (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare("SELECT data FROM profiles WHERE user_id = ?").get(id);
  if (!row) return res.status(404).json({ error: "Profile not found" });
  try {
    const profile = JSON.parse(row.data);
    if (profile.avatarUri) {
      const name = blobNameFromUrl(profile.avatarUri);
      if (name && userContainer) profile.avatarUri = sasUrl(userContainer, name);
    }
    if (profile.bannerUri) {
      const name = blobNameFromUrl(profile.bannerUri);
      if (name && userContainer) profile.bannerUri = sasUrl(userContainer, name);
    }
    res.json(profile);
  } catch {
    res.status(500).json({ error: "Corrupt profile" });
  }
});

app.put("/profiles/:id", auth, (req, res) => {
  const id = Number(req.params.id);
  const data = JSON.stringify(req.body || {});
  db.prepare(
    "INSERT INTO profiles (user_id, data) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data"
  ).run(id, data);
  res.json({ ok: true });
});

app.post("/profiles/:id/avatar", auth, upload.single("file"), async (req, res) => {
  if (!userContainer) return res.status(500).json({ error: "Storage not configured" });
  if (!req.file) return res.status(400).json({ error: "No file" });
  const id = Number(req.params.id);
  if (req.user.sub !== id) return res.status(403).json({ error: "Forbidden" });
  const row = db.prepare("SELECT data FROM profiles WHERE user_id = ?").get(id);
  const data = row ? JSON.parse(row.data) : {};

  // remove previous avatar if present
  if (data.avatarUri && userContainer) {
    try {
      const oldName = blobNameFromUrl(data.avatarUri);
      if (oldName) {
        await userContainer.getBlockBlobClient(oldName).deleteIfExists();
      }
    } catch (err) {
      console.warn("Failed to delete old avatar", err.message);
    }
  }

  const blobName = `${Date.now()}-${req.file.originalname}`;
  try {
    const blockBlob = userContainer.getBlockBlobClient(blobName);
    await blockBlob.upload(req.file.buffer, req.file.size, {
      blobHTTPHeaders: { blobContentType: req.file.mimetype }
    });
    const plainUrl = blockBlob.url;
    data.avatarUri = plainUrl;
    db.prepare(
      "INSERT INTO profiles (user_id, data) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data"
    ).run(id, JSON.stringify(data));
    res.json({ url: sasUrl(userContainer, blobName) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

app.post("/profiles/:id/banner", auth, upload.single("file"), async (req, res) => {
  if (!userContainer) return res.status(500).json({ error: "Storage not configured" });
  if (!req.file) return res.status(400).json({ error: "No file" });
  const id = Number(req.params.id);
  if (req.user.sub !== id) return res.status(403).json({ error: "Forbidden" });
  const row = db.prepare("SELECT data FROM profiles WHERE user_id = ?").get(id);
  const data = row ? JSON.parse(row.data) : {};

  if (data.bannerUri && userContainer) {
    try {
      const oldName = blobNameFromUrl(data.bannerUri);
      if (oldName) {
        await userContainer.getBlockBlobClient(oldName).deleteIfExists();
      }
    } catch (err) {
      console.warn("Failed to delete old banner", err.message);
    }
  }

  const blobName = `${Date.now()}-${req.file.originalname}`;
  try {
    const blockBlob = userContainer.getBlockBlobClient(blobName);
    await blockBlob.upload(req.file.buffer, req.file.size, {
      blobHTTPHeaders: { blobContentType: req.file.mimetype }
    });
    const plainUrl = blockBlob.url;
    data.bannerUri = plainUrl;
    db.prepare(
      "INSERT INTO profiles (user_id, data) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data"
    ).run(id, JSON.stringify(data));
    res.json({ url: sasUrl(userContainer, blobName) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// --- job REST
app.get("/jobs", (req, res) => {
  const rows = db.prepare(`
    SELECT id, title, site, timeframe as 'when', status, location, pay_rate as payRate,
           description, image_uri as imageUri, skills, lat, lng, owner_id as ownerId
    FROM jobs ORDER BY id DESC
  `).all();
  const jobs = rows.map(r => ({ ...r, skills: r.skills ? JSON.parse(r.skills) : [] }));
  res.json(jobs);
});

app.get("/jobs/:id", (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare(`
    SELECT id, title, site, timeframe as 'when', status, location, pay_rate as payRate,
           description, image_uri as imageUri, skills, lat, lng, owner_id as ownerId
    FROM jobs WHERE id = ?
  `).get(id);
  if (!row) return res.status(404).json({ error: "Job not found" });
  const job = { ...row, skills: row.skills ? JSON.parse(row.skills) : [] };
  res.json(job);
});

app.post("/jobs", auth, (req, res) => {
  const { title, site, start, end, location, payRate, description, imageUri, skills = [] } = req.body || {};
  if (!title || !site || !start || !end) return res.status(400).json({ error: 'Missing fields' });
  const when = toWhen(start, end);
  const loc = location || null;
  const lat = loc && loc.toLowerCase().includes('brighton') ? 50.8225 : 51.5074;
  const lng = loc && loc.toLowerCase().includes('brighton') ? -0.1372 : -0.1278;
  const id = db.prepare(`
    INSERT INTO jobs (title, site, timeframe, status, location, pay_rate, description, image_uri, skills, lat, lng, owner_id)
    VALUES (?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, site, when, loc, payRate || null, description || null, imageUri || null, JSON.stringify(skills), lat, lng, req.user.sub).lastInsertRowid;
  const row = db.prepare(`
    SELECT id, title, site, timeframe as 'when', status, location, pay_rate as payRate,
           description, image_uri as imageUri, skills, lat, lng, owner_id as ownerId
    FROM jobs WHERE id = ?
  `).get(id);
  const job = { ...row, skills: row.skills ? JSON.parse(row.skills) : [] };
  res.json(job);
});

app.post("/jobs/:id/image", auth, upload.single("file"), async (req, res) => {
  if (!jobContainer) return res.status(500).json({ error: "Storage not configured" });
  if (!req.file) return res.status(400).json({ error: "No file" });
  const id = Number(req.params.id);

  const row = db.prepare("SELECT image_uri FROM jobs WHERE id = ?").get(id);
  if (!row) return res.status(404).json({ error: "Job not found" });

  // remove previous image if present
  if (row.image_uri) {
    try {
      const oldName = blobNameFromUrl(row.image_uri);
      if (oldName) {
        await jobContainer.getBlockBlobClient(oldName).deleteIfExists();
      }
    } catch (err) {
      console.warn("Failed to delete old job image", err.message);
    }
  }

  const blobName = `${Date.now()}-${req.file.originalname}`;
  try {
    const blockBlob = jobContainer.getBlockBlobClient(blobName);
    await blockBlob.upload(req.file.buffer, req.file.size, {
      blobHTTPHeaders: { blobContentType: req.file.mimetype }
    });
    const url = blockBlob.url;
    db.prepare("UPDATE jobs SET image_uri = ? WHERE id = ?").run(url, id);
    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

app.patch("/jobs/:id", auth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT id FROM jobs WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: 'Job not found' });
  const { title, site, when, status, location, payRate, description, imageUri, skills, lat, lng } = req.body || {};
  const fields = [];
  const params = [];
  if (title !== undefined) { fields.push('title = ?'); params.push(title); }
  if (site !== undefined) { fields.push('site = ?'); params.push(site); }
  if (when !== undefined) { fields.push('timeframe = ?'); params.push(when); }
  if (status !== undefined) { fields.push('status = ?'); params.push(status); }
  if (location !== undefined) { fields.push('location = ?'); params.push(location); }
  if (payRate !== undefined) { fields.push('pay_rate = ?'); params.push(payRate); }
  if (description !== undefined) { fields.push('description = ?'); params.push(description); }
  if (imageUri !== undefined) { fields.push('image_uri = ?'); params.push(imageUri); }
  if (skills !== undefined) { fields.push('skills = ?'); params.push(JSON.stringify(skills)); }
  if (lat !== undefined) { fields.push('lat = ?'); params.push(lat); }
  if (lng !== undefined) { fields.push('lng = ?'); params.push(lng); }
  if (fields.length === 0) return res.status(400).json({ error: 'No changes' });
  db.prepare(`UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`).run(...params, id);
  const row = db.prepare(`
    SELECT id, title, site, timeframe as 'when', status, location, pay_rate as payRate,
           description, image_uri as imageUri, skills, lat, lng, owner_id as ownerId
    FROM jobs WHERE id = ?
  `).get(id);
  const job = { ...row, skills: row.skills ? JSON.parse(row.skills) : [] };
  res.json(job);
});

app.delete("/jobs/:id", auth, async (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare("SELECT image_uri FROM jobs WHERE id = ?").get(id);
  if (!row) return res.status(404).json({ error: 'Job not found' });

  if (row.image_uri && jobContainer) {
    const blobName = blobNameFromUrl(row.image_uri);
    if (blobName) {
      try {
        await jobContainer.getBlockBlobClient(blobName).deleteIfExists();
      } catch (err) {
        console.warn("Failed to delete blob", err.message);
      }
    }
  }

  db.prepare("DELETE FROM jobs WHERE id = ?").run(id);
  res.json({ ok: true });
});

// --- project REST
app.get("/projects", auth, (req, res) => {
  const rows = db.prepare("SELECT id, title, site, timeframe as 'when', status, budget FROM projects ORDER BY id DESC").all();
  res.json(rows);
});

app.post("/projects", auth, (req, res) => {
  const { title, site, when, status = 'open', budget = 0 } = req.body || {};
  if (!title || !site || !when) return res.status(400).json({ error: 'Missing fields' });
  const id = db.prepare("INSERT INTO projects (title, site, timeframe, status, budget) VALUES (?, ?, ?, ?, ?)")
    .run(title, site, when, status, budget).lastInsertRowid;
  const project = db.prepare("SELECT id, title, site, timeframe as 'when', status, budget FROM projects WHERE id = ?").get(id);
  res.json(project);
});

// --- chat REST
app.post("/chats", auth, (req, res) => {
  const { title, memberIds } = req.body || {};
  if (!title || !Array.isArray(memberIds) || memberIds.length === 0) {
    return res.status(400).json({ error: "Invalid chat" });
  }
  const chatId = db.prepare("INSERT INTO chats (title) VALUES (?)").run(title).lastInsertRowid;
  const add = db.prepare("INSERT OR IGNORE INTO chat_members (chat_id, user_id) VALUES (?, ?)");
  memberIds.forEach((uid) => add.run(chatId, uid));
  const chat = db.prepare("SELECT id, title FROM chats WHERE id = ?").get(chatId);
  res.json(chat);
});

app.get("/chats", auth, (req, res) => {
  const rows = db.prepare(`
    SELECT c.id, c.title,
           (SELECT body FROM messages m WHERE m.chat_id=c.id ORDER BY m.id DESC LIMIT 1) as lastMessage,
           (SELECT created_at FROM messages m WHERE m.chat_id=c.id ORDER BY m.id DESC LIMIT 1) as lastTime,
           (SELECT json_group_array(user_id) FROM chat_members cm2 WHERE cm2.chat_id = c.id) AS memberIds
    FROM chats c
    JOIN chat_members cm ON cm.chat_id = c.id
    WHERE cm.user_id = ?
    ORDER BY c.id DESC
  `).all(req.user.sub);
  const chats = rows.map((r) => ({
    ...r,
    memberIds: r.memberIds ? JSON.parse(r.memberIds) : [],
  }));
  res.json(chats);
});

app.delete("/chats/:id", auth, (req, res) => {
  const chatId = Number(req.params.id);
  const member = db
    .prepare("SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?")
    .get(chatId, req.user.sub);
  if (!member) return res.status(403).json({ error: "Forbidden" });
  db.prepare("DELETE FROM messages WHERE chat_id = ?").run(chatId);
  db.prepare("DELETE FROM chat_members WHERE chat_id = ?").run(chatId);
  db.prepare("DELETE FROM applications WHERE chat_id = ?").run(chatId);
  db.prepare("DELETE FROM chats WHERE id = ?").run(chatId);
  res.status(204).end();
});

app.get("/chats/:id/messages", auth, (req, res) => {
  const chatId = Number(req.params.id);
  const msgs = db.prepare(`
    SELECT m.id, m.chat_id, m.user_id, m.body, m.created_at,
           COALESCE(u.username, 'system') as username
    FROM messages m
    LEFT JOIN users u ON u.id = m.user_id
    WHERE m.chat_id = ?
    ORDER BY m.id ASC
  `).all(chatId);
  res.json(msgs);
});

app.post("/chats/:id/messages", auth, (req, res) => {
  const chatId = Number(req.params.id);
  const { body } = req.body || {};
  if (!body || !body.trim()) return res.status(400).json({ error: "Empty message" });
  const stmt = db.prepare("INSERT INTO messages (chat_id, user_id, body) VALUES (?, ?, ?)");
  const id = stmt.run(chatId, req.user.sub, String(body).trim()).lastInsertRowid;
  db.prepare("INSERT OR IGNORE INTO chat_members (chat_id, user_id) VALUES (?, ?)").run(chatId, req.user.sub);
  const msg = db.prepare(`
    SELECT m.id, m.chat_id, m.user_id, m.body, m.created_at,
           COALESCE(u.username, 'system') as username
    FROM messages m LEFT JOIN users u ON u.id = m.user_id
    WHERE m.id = ?
  `).get(id);
  io.to(`chat:${chatId}`).emit("message:new", msg);
  res.json(msg);
});

// --- Construction AI ---
app.get("/ai/messages", auth, (req, res) => {
  const rows = db
    .prepare(
      "SELECT id, role, body, created_at FROM ai_messages WHERE user_id = ? ORDER BY id"
    )
    .all(req.user.sub);
  const messages = rows.map((r) => ({
    id: r.id,
    chat_id: 0,
    user_id: r.role === "user" ? req.user.sub : 0,
    username: r.role === "user" ? req.user.username : "Construction AI",
    body: r.body,
    created_at: r.created_at,
  }));
  res.json(messages);
});

app.post("/ai/messages", auth, async (req, res) => {
  const { body } = req.body || {};
  if (!body || !body.trim()) return res.status(400).json({ error: "Empty message" });
  const userId = req.user.sub;
  const insert = db.prepare(
    "INSERT INTO ai_messages (user_id, role, body) VALUES (?, ?, ?)"
  );
  insert.run(userId, "user", String(body).trim());

  let aiText = "Sorry, I couldn't find an answer.";
  try {
    const search = await googleSearch(String(body));
    const history = db
      .prepare(
        "SELECT role, body FROM ai_messages WHERE user_id = ? ORDER BY id DESC LIMIT 10"
      )
      .all(userId)
      .reverse();
    const messages = [
      { role: "system", content: "You are Construction AI assisting construction managers and labourers." },
      ...history.map((m) => ({ role: m.role, content: m.body })),
      ...(search ? [{ role: "system", content: `Web search results:\n${search}` }] : []),
      { role: "user", content: String(body).trim() },
    ];
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
    });
    aiText = completion.choices?.[0]?.message?.content?.trim() || aiText;
  } catch (e) {
    console.error(e);
  }

  const aiId = insert.run(userId, "assistant", aiText).lastInsertRowid;
  const row = db
    .prepare("SELECT id, role, body, created_at FROM ai_messages WHERE id = ?")
    .get(aiId);
  const msg = {
    id: row.id,
    chat_id: 0,
    user_id: 0,
    username: "Construction AI",
    body: row.body,
    created_at: row.created_at,
  };
  res.json(msg);
});

app.delete("/ai/messages", auth, (req, res) => {
  db.prepare("DELETE FROM ai_messages WHERE user_id = ?").run(req.user.sub);
  res.json({ ok: true });
});

// --- job applications ---
app.post("/applications", auth, (req, res) => {
  const { projectId, chatId, workerId, managerId } = req.body || {};
  if (!projectId || !chatId || !workerId || !managerId) {
    return res.status(400).json({ error: "Invalid application" });
  }
  db.prepare(
    "INSERT OR IGNORE INTO applications (project_id, chat_id, worker_id, manager_id, status) VALUES (?, ?, ?, ?, 'pending')"
  ).run(projectId, chatId, workerId, managerId);
  const worker = db.prepare("SELECT username FROM users WHERE id = ?").get(workerId);
  const body = `${(worker && worker.username) || "Worker"} applied to this job`;
  const msgId = db.prepare("INSERT INTO messages (chat_id, user_id, body) VALUES (?, 0, ?)")
    .run(chatId, body).lastInsertRowid;
  const msg = db.prepare(`
    SELECT m.id, m.chat_id, m.user_id, m.body, m.created_at,
           COALESCE(u.username, 'system') as username
    FROM messages m LEFT JOIN users u ON u.id = m.user_id
    WHERE m.id = ?
  `).get(msgId);
  io.to(`chat:${chatId}`).emit("message:new", msg);
  const appRow = db.prepare("SELECT * FROM applications WHERE chat_id = ?").get(chatId);
  res.json(appRow);
});

app.get("/applications/by-chat/:chatId", auth, (req, res) => {
  const chatId = Number(req.params.chatId);
  const row = db.prepare("SELECT * FROM applications WHERE chat_id = ?").get(chatId);
  res.json(row || null);
});

app.patch("/applications/by-chat/:chatId", auth, (req, res) => {
  const chatId = Number(req.params.chatId);
  const { status } = req.body || {};
  if (!status || !["accepted", "declined"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  const existing = db.prepare("SELECT * FROM applications WHERE chat_id = ?").get(chatId);
  if (!existing) return res.status(404).json({ error: "Application not found" });
  db.prepare("UPDATE applications SET status = ? WHERE chat_id = ?").run(status, chatId);
  if (status === "accepted") {
    db.prepare("INSERT OR IGNORE INTO project_workers (project_id, user_id) VALUES (?, ?)")
      .run(existing.project_id, existing.worker_id);
  }
  const body = `Manager ${status} the application`;
  const msgId = db.prepare("INSERT INTO messages (chat_id, user_id, body) VALUES (?, 0, ?)")
    .run(chatId, body).lastInsertRowid;
  const msg = db.prepare(`
    SELECT m.id, m.chat_id, m.user_id, m.body, m.created_at,
           COALESCE(u.username, 'system') as username
    FROM messages m LEFT JOIN users u ON u.id = m.user_id
    WHERE m.id = ?
  `).get(msgId);
  io.to(`chat:${chatId}`).emit("message:new", msg);
  const appRow = db.prepare("SELECT * FROM applications WHERE chat_id = ?").get(chatId);
  res.json(appRow);
});

// --- health (for quick checks)
app.get("/health", (req, res) => {
  res.json({ ok: true, node: process.version, dbPath });
});

// --- sockets
io.on("connection", (socket) => {
  socket.on("join", ({ chatId }) => {
    socket.join(`chat:${chatId}`);
  });
  socket.on("typing", ({ chatId, username }) => {
    socket.to(`chat:${chatId}`).emit("typing", { chatId, username });
  });
});

const HOST = process.env.HOST || "0.0.0.0";

server.listen(PORT, HOST, () => {
  console.log(`API listening on http://${HOST}:${PORT}`);
});
