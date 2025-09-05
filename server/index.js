const express = require("express");
const http = require("http");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Server } = require("socket.io");
const path = require("path");
const multer = require("multer");
const OpenAI = require("openai");
const braintree = require("braintree");
const {
  BlobServiceClient,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
} = require("@azure/storage-blob");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
// Allow both OPENAI_API_KEY and OPENAI_KEY for configuration
const openaiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;

const gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: process.env.BRAINTREE_MERCHANT_ID,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY,
});

const BRAINTREE_PLAN_MONTHLY = process.env.BRAINTREE_PLAN_MONTHLY || "p3wt";
const BRAINTREE_PLAN_YEARLY = process.env.BRAINTREE_PLAN_YEARLY || "55xy";
const VALID_PLANS = [BRAINTREE_PLAN_MONTHLY, BRAINTREE_PLAN_YEARLY];

const getOpenAI = () => {
  const key = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
  return key ? new OpenAI({ apiKey: key }) : null;
};

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
  if (!GOOGLE_API_KEY || !GOOGLE_CX) {
    console.warn("GOOGLE_API_KEY or GOOGLE_CX not set; skipping web search");
    return null;
  }
  const url =
    `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}`;
  try {
    const r = await fetch(url);
    if (!r.ok) {
      console.error(`Google search failed: ${r.status} ${r.statusText} - ${url}`);
      return null;
    }
    const data = await r.json();
    if (!Array.isArray(data.items)) return null;
    return data.items
      .slice(0, 3)
      .map((i) => `${i.title}: ${i.link}`)
      .join("\n");
  } catch (e) {
    console.error(`Google search error for ${url}:`, e);
    return null;
  }
};

// --- DB setup (PostgreSQL)
const db = require("./db");

(async () => {
  await db.query(`CREATE TABLE IF NOT EXISTS users(
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL
  )`);

  await db.query(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS braintree_customer_id TEXT"
  );
  await db.query(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS braintree_subscription_id TEXT"
  );
  await db.query(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan TEXT"
  );
  await db.query(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT"
  );

  await db.query(`CREATE TABLE IF NOT EXISTS profiles(
    user_id INTEGER PRIMARY KEY,
    data TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS chats(
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS chat_members(
    chat_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    PRIMARY KEY (chat_id, user_id)
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS messages(
    id SERIAL PRIMARY KEY,
    chat_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS ai_messages(
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS projects(
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    site TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    status TEXT NOT NULL,
    budget INTEGER DEFAULT 0
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS project_workers(
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    PRIMARY KEY (project_id, user_id)
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS applications(
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL,
    chat_id INTEGER NOT NULL,
    worker_id INTEGER NOT NULL,
    manager_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (job_id, worker_id)
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS jobs(
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    site TEXT NOT NULL,
    timeframe TEXT NOT NULL,
    status TEXT NOT NULL,
    location TEXT,
    pay_rate TEXT,
    description TEXT,
    image_uri TEXT,
    skills TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    owner_id INTEGER,
    is_private BOOLEAN NOT NULL DEFAULT FALSE
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS tasks(
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    assignee_id INTEGER REFERENCES users(id),
    job_id INTEGER REFERENCES jobs(id),
    status TEXT NOT NULL DEFAULT 'pending'
  )`);

  await db.query(
    "INSERT INTO users (id, email, username, password_hash, role) VALUES (0, 'system@buildboard.local', 'system', '', 'system') ON CONFLICT (id) DO NOTHING"
  );
})().catch((e) => {
  console.error('DB init failed', e);
  process.exit(1);
});

// --- helpers
const signToken = (user) =>
  jwt.sign(
    { sub: Number(user.id), role: user.role, username: user.username },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

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
    // force numeric user id
    req.user.sub = Number(req.user.sub);
    if (!Number.isFinite(req.user.sub)) {
      return res.status(401).json({ error: "Invalid token" });
    }
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

const insertAiMessage = db.prepare(`
  INSERT INTO ai_messages (user_id, role, body)
  VALUES (?, ?, ?)
  RETURNING id, user_id, role, body, created_at
`);

// --- auth routes
app.post("/auth/register", async (req, res) => {
  const { email, username, password, role = "labourer" } = req.body || {};
  if (!email || !username || !password) return res.status(400).json({ error: "Missing fields" });
  try {
    const hash = bcrypt.hashSync(password, 8);
    const id = (
      await db
        .prepare(
          "INSERT INTO users (email, username, password_hash, role) VALUES (?, ?, ?, ?) RETURNING id"
        )
        .run(email, username, hash, role)
    ).lastInsertRowid;
    const user = await db
      .prepare(
        "SELECT id, email, username, role, subscription_plan, subscription_status FROM users WHERE id = ?"
      )
      .get(id);
    res.json({ user, token: signToken(user) });
  } catch (e) {
    res.status(400).json({ error: "Email already exists" });
  }
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  const user = await db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email || "");
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = bcrypt.compareSync(password || "", user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  const safe = {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    subscription_plan: user.subscription_plan,
    subscription_status: user.subscription_status,
  };
  res.json({ user: safe, token: signToken(safe) });
});

app.get("/me", auth, async (req, res) => {
  const u = await db
    .prepare(
      "SELECT id, email, username, role, subscription_plan, subscription_status FROM users WHERE id = ?"
    )
    .get(req.user.sub);
  res.json({ user: u });
});

// --- Braintree subscription routes ---

app.get("/braintree/checkout", async (req, res) => {
  const { planId, token } = req.query;
  if (!planId || !VALID_PLANS.includes(String(planId))) {
    return res.status(400).send("Invalid plan");
  }
  try {
    const t = await gateway.clientToken.generate({});
    res.send(`<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Subscribe</title>
<script src="https://js.braintreegateway.com/web/dropin/1.44.0/js/dropin.min.js"></script>
</head>
<body>
<div id="dropin"></div>
<button id="submit">Subscribe</button>
<script>
var authToken = ${JSON.stringify(token || "")};
var planId = ${JSON.stringify(planId)};
braintree.dropin.create({
  authorization: ${JSON.stringify(t.clientToken)},
  container: '#dropin',
  paypal: { flow: 'vault' },
  applePay: { displayName: 'BuildBoard', paymentRequest: { total: { label: 'BuildBoard Pro', amount: '1.00' } } }
}, function (createErr, instance) {
  document.getElementById('submit').addEventListener('click', function () {
    instance.requestPaymentMethod(function (err, payload) {
      fetch('/braintree/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
        body: JSON.stringify({ paymentMethodNonce: payload.nonce, planId: planId })
      }).then(function () {
        document.body.innerHTML = '<h3>Success</h3>';
      }).catch(function () {
        document.body.innerHTML = '<h3>Error</h3>';
      });
    });
  });
});
</script>
</body>
</html>`);
  } catch (e) {
    console.error(e);
    res.status(500).send("Failed to load checkout");
  }
});

app.post("/braintree/subscribe", auth, async (req, res) => {
  const { paymentMethodNonce, planId } = req.body || {};
  if (!paymentMethodNonce || !planId || !VALID_PLANS.includes(planId)) {
    return res.status(400).json({ error: "Missing fields" });
  }
  try {
    const userId = req.user.sub;
    const user = await db
      .prepare("SELECT email, braintree_customer_id FROM users WHERE id = ?")
      .get(userId);
    let customerId = user?.braintree_customer_id;
    if (!customerId) {
      const customerResult = await gateway.customer.create({ email: user.email });
      if (!customerResult.success) {
        return res.status(500).json({ error: customerResult.message || "Customer creation failed" });
      }
      customerId = customerResult.customer.id;
    }
    const pmResult = await gateway.paymentMethod.create({
      customerId,
      paymentMethodNonce,
    });
    if (!pmResult.success) {
      return res.status(500).json({ error: pmResult.message || "Payment method failed" });
    }
    const subResult = await gateway.subscription.create({
      paymentMethodToken: pmResult.paymentMethod.token,
      planId,
    });
    if (!subResult.success) {
      return res.status(500).json({ error: subResult.message || "Subscription failed" });
    }
    await db.query(
      "UPDATE users SET braintree_customer_id = ?, braintree_subscription_id = ?, subscription_plan = ?, subscription_status = ? WHERE id = ?",
      [
        customerId,
        subResult.subscription.id,
        planId,
        subResult.subscription.status,
        userId,
      ]
    );
    res.json({ subscription: subResult.subscription });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Subscription failed" });
  }
});

app.post("/braintree/cancel", auth, async (req, res) => {
  const row = await db
    .prepare("SELECT braintree_subscription_id FROM users WHERE id = ?")
    .get(req.user.sub);
  if (row?.braintree_subscription_id) {
    try {
      await gateway.subscription.cancel(row.braintree_subscription_id);
    } catch (e) {
      console.warn("Cancel subscription failed", e);
    }
  }
  await db.query(
    "UPDATE users SET braintree_subscription_id = NULL, subscription_plan = NULL, subscription_status = 'Canceled' WHERE id = ?",
    [req.user.sub]
  );
  res.json({ ok: true });
});

app.post(
  "/braintree/webhook",
  express.urlencoded({ extended: false }),
  async (req, res) => {
    const { bt_signature, bt_payload } = req.body || {};
    try {
      const notification = await gateway.webhookNotification.parse(
        bt_signature,
        bt_payload
      );
      const sub = notification.subscription;
      if (sub && sub.id) {
        await db.query(
          "UPDATE users SET subscription_status = ? WHERE braintree_subscription_id = ?",
          [sub.status, sub.id]
        );
      }
      res.sendStatus(200);
    } catch (e) {
      console.error("Webhook error", e);
      res.sendStatus(500);
    }
  }
);

// --- profiles ---
app.get("/profiles/:id", async (req, res) => {
  const id = Number(req.params.id);
  const row = await db.prepare("SELECT data FROM profiles WHERE user_id = ?").get(id);
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

app.put("/profiles/:id", auth, async (req, res) => {
  const id = Number(req.params.id);
  const data = JSON.stringify(req.body || {});
  await db
    .prepare(
      "INSERT INTO profiles (user_id, data) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data"
    )
    .run(id, data);
  res.json({ ok: true });
});

app.post("/profiles/:id/avatar", auth, upload.single("file"), async (req, res) => {
  if (!userContainer) return res.status(500).json({ error: "Storage not configured" });
  if (!req.file) return res.status(400).json({ error: "No file" });
  const id = Number(req.params.id);
  if (req.user.sub !== id) return res.status(403).json({ error: "Forbidden" });
  const row = await db.prepare("SELECT data FROM profiles WHERE user_id = ?").get(id);
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
    await db
      .prepare(
        "INSERT INTO profiles (user_id, data) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data"
      )
      .run(id, JSON.stringify(data));
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
  const row = await db.prepare("SELECT data FROM profiles WHERE user_id = ?").get(id);
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
    await db
      .prepare(
        "INSERT INTO profiles (user_id, data) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data"
      )
      .run(id, JSON.stringify(data));
    res.json({ url: sasUrl(userContainer, blobName) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// --- job REST
const parseSkills = (s) => {
  try {
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
};

app.get("/jobs", async (req, res) => {
  const ownerId = req.query.ownerId ? Number(req.query.ownerId) : null;
  let sql =
    `SELECT id, title, site, timeframe as "when", status, location, pay_rate as "payRate",
            description, image_uri as "imageUri", skills, lat, lng, owner_id as "ownerId",
            is_private as "isPrivate"
       FROM jobs WHERE is_private = false`;
  const params = [];
  if (ownerId !== null && !Number.isNaN(ownerId)) {
    sql += " OR owner_id = ?";
    params.push(ownerId);
  }
  sql += " ORDER BY id DESC";
  const { rows } = await db.query(sql, params);
  const jobs = rows.map((r) => ({ ...r, skills: parseSkills(r.skills) }));
  res.json(jobs);
});

app.get("/jobs/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await db.query(
    `SELECT id, title, site, timeframe as "when", status, location, pay_rate as "payRate",
            description, image_uri as "imageUri", skills, lat, lng, owner_id as "ownerId",
            is_private as "isPrivate"
       FROM jobs WHERE id = ?`,
    [id]
  );
  const row = rows[0];
  if (!row) return res.status(404).json({ error: "Job not found" });
  res.json({ ...row, skills: parseSkills(row.skills) });
});

app.get("/jobs/:id/workers", async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await db.query(
    `SELECT u.id, u.username, p.data
       FROM project_workers pw
       JOIN users u ON u.id = pw.user_id
       LEFT JOIN profiles p ON p.user_id = u.id
      WHERE pw.project_id = ?`,
    [id]
  );
  const workers = rows.map((r) => {
    let avatarUri = null;
    if (r.data) {
      try {
        const profile = JSON.parse(r.data);
        avatarUri = profile.avatarUri || null;
        if (avatarUri) {
          const name = blobNameFromUrl(avatarUri);
          if (name && userContainer) avatarUri = sasUrl(userContainer, name);
        }
      } catch {}
    }
    return { id: r.id, username: r.username, avatarUri };
  });
  res.json(workers);
});

app.post("/jobs", auth, async (req, res) => {
  const { title, site, start, end, location, payRate, description, imageUri, skills = [], isPrivate } =
    req.body || {};
  if (!title || !site || !start || !end || isPrivate === undefined) {
    return res.status(400).json({ error: "Missing fields" });
  }
  const when = toWhen(start, end);
  const loc = location || null;
  const lat = loc && loc.toLowerCase().includes("brighton") ? 50.8225 : 51.5074;
  const lng = loc && loc.toLowerCase().includes("brighton") ? -0.1372 : -0.1278;
  const { rows } = await db.query(
    `INSERT INTO jobs (title, site, timeframe, status, location, pay_rate, description, image_uri, skills, lat, lng, owner_id, is_private)
       VALUES (?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, title, site,
              timeframe as "when", status, location, pay_rate as "payRate",
              description, image_uri as "imageUri", skills, lat, lng, owner_id as "ownerId",
              is_private as "isPrivate"`,
    [
      title,
      site,
      when,
      loc,
      payRate || null,
      description || null,
      imageUri || null,
      JSON.stringify(skills),
      lat,
      lng,
      req.user.sub,
      isPrivate,
    ]
  );
  const row = rows[0];
  res.json({ ...row, skills: parseSkills(row.skills) });
});

app.post("/jobs/:id/image", auth, upload.single("file"), async (req, res) => {
  if (!jobContainer) return res.status(500).json({ error: "Storage not configured" });
  if (!req.file) return res.status(400).json({ error: "No file" });
  const id = Number(req.params.id);

  const { rows } = await db.query("SELECT image_uri FROM jobs WHERE id = ?", [id]);
  const row = rows[0];
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
      blobHTTPHeaders: { blobContentType: req.file.mimetype },
    });
    const url = blockBlob.url;
    await db.query("UPDATE jobs SET image_uri = ? WHERE id = ?", [url, id]);
    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

app.patch("/jobs/:id", auth, async (req, res) => {
  const id = Number(req.params.id);
  const { rows: existRows } = await db.query("SELECT id FROM jobs WHERE id = ?", [id]);
  if (!existRows[0]) return res.status(404).json({ error: "Job not found" });
  const {
    title,
    site,
    when,
    status,
    location,
    payRate,
    description,
    imageUri,
    skills,
    lat,
    lng,
    isPrivate,
  } = req.body || {};
  const fields = [];
  const params = [];
  if (title !== undefined) {
    fields.push("title = ?");
    params.push(title);
  }
  if (site !== undefined) {
    fields.push("site = ?");
    params.push(site);
  }
  if (when !== undefined) {
    fields.push("timeframe = ?");
    params.push(when);
  }
  if (status !== undefined) {
    fields.push("status = ?");
    params.push(status);
  }
  if (location !== undefined) {
    fields.push("location = ?");
    params.push(location);
  }
  if (payRate !== undefined) {
    fields.push("pay_rate = ?");
    params.push(payRate);
  }
  if (description !== undefined) {
    fields.push("description = ?");
    params.push(description);
  }
  if (imageUri !== undefined) {
    fields.push("image_uri = ?");
    params.push(imageUri);
  }
  if (skills !== undefined) {
    fields.push("skills = ?");
    params.push(JSON.stringify(skills));
  }
  if (lat !== undefined) {
    fields.push("lat = ?");
    params.push(lat);
  }
  if (lng !== undefined) {
    fields.push("lng = ?");
    params.push(lng);
  }
  if (isPrivate !== undefined) {
    fields.push("is_private = ?");
    params.push(isPrivate);
  }
  if (fields.length === 0) return res.status(400).json({ error: "No changes" });
  await db.query(`UPDATE jobs SET ${fields.join(", ")} WHERE id = ?`, [...params, id]);
  const { rows } = await db.query(
    `SELECT id, title, site, timeframe as "when", status, location, pay_rate as "payRate",
            description, image_uri as "imageUri", skills, lat, lng, owner_id as "ownerId",
            is_private as "isPrivate"
       FROM jobs WHERE id = ?`,
    [id]
  );
  const row = rows[0];
  res.json({ ...row, skills: parseSkills(row.skills) });
});

app.delete("/jobs/:id", auth, async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await db.query("SELECT image_uri FROM jobs WHERE id = ?", [id]);
  const row = rows[0];
  if (!row) return res.status(404).json({ error: "Job not found" });

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

  await db.query("DELETE FROM jobs WHERE id = ?", [id]);
  res.json({ ok: true });
});

// --- task REST
app.get("/tasks", async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, title, description, due_date as "dueDate", assignee_id as "assigneeId", job_id as "jobId", status FROM tasks ORDER BY id DESC`
  );
  res.json(rows);
});

app.get("/tasks/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await db.query(
    `SELECT id, title, description, due_date as "dueDate", assignee_id as "assigneeId", job_id as "jobId", status FROM tasks WHERE id = ?`,
    [id]
  );
  const row = rows[0];
  if (!row) return res.status(404).json({ error: "Task not found" });
  res.json(row);
});

app.post("/tasks", auth, async (req, res) => {
  const { title, description, dueDate, assigneeId, jobId, status = "pending" } = req.body || {};
  if (!title) return res.status(400).json({ error: "Missing title" });
  const { rows } = await db.query(
    `INSERT INTO tasks (title, description, due_date, assignee_id, job_id, status) VALUES (?, ?, ?, ?, ?, ?) RETURNING id, title, description, due_date as "dueDate", assignee_id as "assigneeId", job_id as "jobId", status`,
    [title, description || null, dueDate || null, assigneeId || null, jobId || null, status]
  );
  res.json(rows[0]);
});

app.patch("/tasks/:id", auth, async (req, res) => {
  const id = Number(req.params.id);
  const { rows: existRows } = await db.query("SELECT id FROM tasks WHERE id = ?", [id]);
  if (!existRows[0]) return res.status(404).json({ error: "Task not found" });
  const { title, description, dueDate, assigneeId, jobId, status } = req.body || {};
  const fields = [];
  const params = [];
  if (title !== undefined) {
    fields.push("title = ?");
    params.push(title);
  }
  if (description !== undefined) {
    fields.push("description = ?");
    params.push(description);
  }
  if (dueDate !== undefined) {
    fields.push("due_date = ?");
    params.push(dueDate);
  }
  if (assigneeId !== undefined) {
    fields.push("assignee_id = ?");
    params.push(assigneeId);
  }
  if (jobId !== undefined) {
    fields.push("job_id = ?");
    params.push(jobId);
  }
  if (status !== undefined) {
    fields.push("status = ?");
    params.push(status);
  }
  if (fields.length === 0) return res.status(400).json({ error: "No changes" });
  await db.query(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`, [...params, id]);
  const { rows } = await db.query(
    `SELECT id, title, description, due_date as "dueDate", assignee_id as "assigneeId", job_id as "jobId", status FROM tasks WHERE id = ?`,
    [id]
  );
  res.json(rows[0]);
});

app.delete("/tasks/:id", auth, async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await db.query("SELECT id FROM tasks WHERE id = ?", [id]);
  if (!rows[0]) return res.status(404).json({ error: "Task not found" });
  await db.query("DELETE FROM tasks WHERE id = ?", [id]);
  res.json({ ok: true });
});


// --- project REST
app.get("/projects", auth, async (req, res) => {
  const { rows } = await db.query(
    'SELECT id, title, site, timeframe AS "when", status, budget FROM projects ORDER BY id DESC'
  );
  res.json(rows);
});

app.post("/projects", auth, async (req, res) => {
  const { title, site, when, status = 'open', budget = 0 } = req.body || {};
  if (!title || !site || !when) return res.status(400).json({ error: 'Missing fields' });
  const { rows } = await db.query(
    'INSERT INTO projects (title, site, timeframe, status, budget) VALUES (?, ?, ?, ?, ?) RETURNING id, title, site, timeframe AS "when", status, budget',
    [title, site, when, status, budget]
  );
  res.json(rows[0]);
});

// --- chat REST
app.post("/chats", auth, async (req, res) => {
  const { title, memberIds } = req.body || {};
  if (!title || !Array.isArray(memberIds) || memberIds.length === 0) {
    return res.status(400).json({ error: "Invalid chat" });
  }
  const chatId = (
    await db.prepare("INSERT INTO chats (title) VALUES (?) RETURNING id").run(title)
  ).lastInsertRowid;
  const add = db.prepare(
    "INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING"
  );
  for (const uid of memberIds) {
    await add.run(chatId, uid);
  }
  const chat = await db.prepare("SELECT id, title FROM chats WHERE id = ?").get(chatId);
  res.json(chat);
});

app.get("/chats", auth, async (req, res) => {
  const rows = await db.prepare(`
    SELECT c.id, c.title,
           (SELECT body FROM messages m WHERE m.chat_id=c.id ORDER BY m.id DESC LIMIT 1) as "lastMessage",
           (SELECT created_at FROM messages m WHERE m.chat_id=c.id ORDER BY m.id DESC LIMIT 1) as "lastTime",
           (SELECT json_agg(user_id) FROM chat_members cm2 WHERE cm2.chat_id = c.id) AS "memberIds"
    FROM chats c
    JOIN chat_members cm ON cm.chat_id = c.id
    WHERE cm.user_id = ?
    GROUP BY c.id, c.title
    ORDER BY c.id DESC
  `).all(req.user.sub);
  const chats = rows.map((r) => ({
    ...r,
    memberIds: r.memberIds || [],
  }));
  res.json(chats);
});

app.delete("/chats/:id", auth, async (req, res) => {
  const chatId = Number(req.params.id);
  const member = await db
    .prepare("SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?")
    .get(chatId, req.user.sub);
  if (!member) return res.status(403).json({ error: "Forbidden" });
  await db.prepare("DELETE FROM messages WHERE chat_id = ?").run(chatId);
  await db.prepare("DELETE FROM chat_members WHERE chat_id = ?").run(chatId);
  await db.prepare("DELETE FROM applications WHERE chat_id = ?").run(chatId);
  await db.prepare("DELETE FROM chats WHERE id = ?").run(chatId);
  res.status(204).end();
});

app.get("/chats/:id/messages", auth, async (req, res) => {
  const chatId = Number(req.params.id);
  const msgs = await db.prepare(`
    SELECT m.id, m.chat_id, m.user_id, m.body, m.created_at,
           COALESCE(u.username, 'system') as username
    FROM messages m
    LEFT JOIN users u ON u.id = m.user_id
    WHERE m.chat_id = ?
    ORDER BY m.id ASC
  `).all(chatId);
  res.json(msgs);
});

app.post("/chats/:id/messages", auth, async (req, res) => {
  const chatId = Number(req.params.id);
  const { body } = req.body || {};
  if (!body || !body.trim()) return res.status(400).json({ error: "Empty message" });
  const id = (
    await db
      .prepare("INSERT INTO messages (chat_id, user_id, body) VALUES (?, ?, ?) RETURNING id")
      .run(chatId, req.user.sub, String(body).trim())
  ).lastInsertRowid;
  await db
    .prepare(
      "INSERT INTO chat_members (chat_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING"
    )
    .run(chatId, req.user.sub);
  const msg = await db.prepare(`
    SELECT m.id, m.chat_id, m.user_id, m.body, m.created_at,
           COALESCE(u.username, 'system') as username
    FROM messages m LEFT JOIN users u ON u.id = m.user_id
    WHERE m.id = ?
  `).get(id);
  io.to(`chat:${chatId}`).emit("message:new", msg);
  res.json(msg);
});

// --- Construction AI ---
app.get("/ai/messages", auth, async (req, res) => {
  const rows = await db
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
  try {
    const { body } = req.body || {};
    if (!body || !body.trim()) return res.status(400).json({ error: "Empty message" });
    const userId = req.user.sub;

    // Insert the user's message and get the saved row
    const userRow = await insertAiMessage.get(userId, "user", String(body).trim());

    let aiText = "Sorry, I couldn't find an answer.";
    const openai = getOpenAI();

    if (!openai) {
      aiText = "Construction AI is not configured.";
    } else {
      try {
        // Load the recent history for context
        const history = (
          await db
            .prepare("SELECT role, body FROM ai_messages WHERE user_id = ? ORDER BY id DESC LIMIT 10")
            .all(userId)
        ).reverse();

        const messages = [
          { role: "system", content: "You are Construction AI assisting construction managers and labourers." },
          ...history.map((m) => ({ role: m.role, content: m.body })),
        ];

        // Hard timeout: abort after 15 seconds
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const completion = await openai.chat.completions.create(
          {
            model: "gpt-4o-mini",
            messages,
          },
          { signal: controller.signal }
        );

        clearTimeout(timeout);
        aiText = completion.choices?.[0]?.message?.content?.trim() || aiText;
      } catch (e) {
        console.error("OpenAI error:", e);
        aiText = "I ran into an issue generating a reply just now.";
      }
    }

    // Insert AI reply and return it
    const aiRow = await insertAiMessage.get(userId, "assistant", aiText);
    const msg = {
      id: aiRow.id,
      chat_id: 0,
      user_id: 0,
      username: "Construction AI",
      body: aiRow.body,
      created_at: aiRow.created_at,
    };
    res.json(msg);
  } catch (e) {
    console.error("AI messages handler error:", e);
    res.status(500).json({ error: "AI chat failed unexpectedly." });
  }
});

app.delete("/ai/messages", auth, async (req, res) => {
  await db.prepare("DELETE FROM ai_messages WHERE user_id = ?").run(req.user.sub);
  res.json({ ok: true });
});

// --- job applications ---
app.post("/applications", auth, async (req, res) => {
  const { jobId, projectId, chatId, workerId, managerId } = req.body || {};
  const job_id = Number(jobId ?? projectId); // accept either, prefer jobId
  if (!job_id || !chatId || !workerId || !managerId) {
    return res.status(400).json({ error: "Invalid application" });
  }
  await db.prepare(
    "INSERT INTO applications (job_id, chat_id, worker_id, manager_id, status) VALUES (?, ?, ?, ?, 'pending') ON CONFLICT (job_id, worker_id) DO NOTHING"
  ).run(job_id, chatId, workerId, managerId);
  const worker = await db.prepare("SELECT username FROM users WHERE id = ?").get(workerId);
  const body = `${(worker && worker.username) || "Worker"} applied to this job`;
  const msgId = (
    await db
      .prepare("INSERT INTO messages (chat_id, user_id, body) VALUES (?, 0, ?) RETURNING id")
      .run(chatId, body)
  ).lastInsertRowid;
  const msg = await db.prepare(`
    SELECT m.id, m.chat_id, m.user_id, m.body, m.created_at,
           COALESCE(u.username, 'system') as username
    FROM messages m LEFT JOIN users u ON u.id = m.user_id
    WHERE m.id = ?
  `).get(msgId);
  io.to(`chat:${chatId}`).emit("message:new", msg);
  const appRow = await db.prepare("SELECT * FROM applications WHERE chat_id = ?").get(chatId);
  res.json(appRow);
});

app.get("/applications/by-chat/:chatId", auth, async (req, res) => {
  const chatId = Number(req.params.chatId);
  const row = await db.prepare("SELECT * FROM applications WHERE chat_id = ?").get(chatId);
  res.json(row || null);
});

app.patch("/applications/by-chat/:chatId", auth, async (req, res) => {
  const chatId = Number(req.params.chatId);
  const { status } = req.body || {};
  if (!status || !["accepted", "declined"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  const existing = await db.prepare("SELECT * FROM applications WHERE chat_id = ?").get(chatId);
  if (!existing) return res.status(404).json({ error: "Application not found" });
  await db.prepare("UPDATE applications SET status = ? WHERE chat_id = ?").run(status, chatId);
  if (status === "accepted") {
    await db
      .prepare("INSERT INTO project_workers (project_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING")
      .run(existing.job_id, existing.worker_id);
  }
  const body = `Manager ${status} the application`;
  const msgId = (
    await db
      .prepare("INSERT INTO messages (chat_id, user_id, body) VALUES (?, 0, ?) RETURNING id")
      .run(chatId, body)
  ).lastInsertRowid;
  const msg = await db.prepare(`
    SELECT m.id, m.chat_id, m.user_id, m.body, m.created_at,
           COALESCE(u.username, 'system') as username
    FROM messages m LEFT JOIN users u ON u.id = m.user_id
    WHERE m.id = ?
  `).get(msgId);
  io.to(`chat:${chatId}`).emit("message:new", msg);
  const appRow = await db.prepare("SELECT * FROM applications WHERE chat_id = ?").get(chatId);
  res.json(appRow);
});

// --- health (for quick checks)
app.get("/health", (req, res) => {
  res.json({ ok: true, node: process.version });
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