const express = require("express");
const http = require("http");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Server } = require("socket.io");
const Database = require("better-sqlite3");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- DB setup (SQLite)
const db = new Database("./buildboard.db");
db.pragma("journal_mode = WAL");

// tables
db.prepare(`CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL
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

// seed demo data (idempotent)
const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
if (userCount === 0) {
  const hash = (p) => bcrypt.hashSync(p, 8);
  const insertUser = db.prepare("INSERT INTO users (email, username, password_hash, role) VALUES (?, ?, ?, ?)");
  const u1 = insertUser.run("worker@demo.com", "Worker", hash("demo1234"), "labourer").lastInsertRowid;
  const u2 = insertUser.run("manager@demo.com", "Manager", hash("demo1234"), "manager").lastInsertRowid;
  const u3 = insertUser.run("client@demo.com", "Client", hash("demo1234"), "client").lastInsertRowid;

  const chatId = db.prepare("INSERT INTO chats (title) VALUES (?)").run("Site Thread").lastInsertRowid;
  const addMem = db.prepare("INSERT OR IGNORE INTO chat_members (chat_id, user_id) VALUES (?, ?)");
  [u1, u2, u3].forEach(uid => addMem.run(chatId, uid));

  const addMsg = db.prepare("INSERT INTO messages (chat_id, user_id, body) VALUES (?, ?, ?)");
  addMsg.run(chatId, u2, "Morning team, deliveries by 10am.");
  addMsg.run(chatId, u1, "Copy that, will be on site at 8.");
  addMsg.run(chatId, u3, "Please share progress photos later.");
  console.log("Seeded demo users (password 'demo1234') and a chat.");
}

const projectCount = db.prepare("SELECT COUNT(*) as c FROM projects").get().c;
if (projectCount === 0) {
  const insertProject = db.prepare("INSERT INTO projects (title, site, timeframe, status, budget) VALUES (?, ?, ?, ?, ?)");
  insertProject.run("Extension and refurb", "Hangleton Homemakers Ltd", "10 Jul - 20 Oct", "in_progress", 15000);
  insertProject.run("Landscaping and Summer house", "Garden & Landscaping Ltd", "11 Nov - 20 Oct", "open", 8000);
  console.log("Seeded demo projects.");
}

// --- helpers
const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role, username: user.username }, JWT_SECRET, { expiresIn: "7d" });

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

app.get("/chats/:id/messages", auth, (req, res) => {
  const chatId = Number(req.params.id);
  const msgs = db.prepare(`
    SELECT m.id, m.chat_id, m.user_id, m.body, m.created_at,
           u.username
    FROM messages m
    JOIN users u ON u.id = m.user_id
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
    SELECT m.id, m.chat_id, m.user_id, m.body, m.created_at, u.username
    FROM messages m JOIN users u ON u.id = m.user_id
    WHERE m.id = ?
  `).get(id);
  io.to(`chat:${chatId}`).emit("message:new", msg);
  res.json(msg);
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
  const msgId = db.prepare("INSERT INTO messages (chat_id, user_id, body) VALUES (?, ?, ?)")
    .run(chatId, req.user.sub, `Manager ${status} the application`).lastInsertRowid;
  const msg = db.prepare(`
    SELECT m.id, m.chat_id, m.user_id, m.body, m.created_at, u.username
    FROM messages m JOIN users u ON u.id = m.user_id
    WHERE m.id = ?
  `).get(msgId);
  io.to(`chat:${chatId}`).emit("message:new", msg);
  const appRow = db.prepare("SELECT * FROM applications WHERE chat_id = ?").get(chatId);
  res.json(appRow);
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
