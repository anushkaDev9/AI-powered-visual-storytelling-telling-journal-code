import express from "express";
import session from "cookie-session";
import cors from "cors";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";
import aiRoutes from "./ai.js";
import { upsertUser, userExistsByEmail } from "./db.js"; // ✅ REAL DB FUNCTIONS
import generateNarrativeRouter from "./ai.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import { Firestore } from "@google-cloud/firestore";



dotenv.config();

const {
  PORT = 3000,
  SESSION_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  FRONTEND_ORIGIN = "http://localhost:3001",
} = process.env;

const app = express();

app.use(
  cors({
    origin: [FRONTEND_ORIGIN, "http://localhost:5173"],
    credentials: true,
  })
);

app.use(express.json());
app.set("trust proxy", 1);

app.use(
  session({
    name: "sess",
    keys: [SESSION_SECRET],
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
);

const oauth = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

const BASE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/photoslibrary.appendonly",
];

app.get("/google", (req, res) => {
  const state = typeof req.query.next === "string" ? req.query.next : "";
  const url = oauth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: BASE_SCOPES,
    state,
  });
  res.redirect(url);
});

app.get("/google/callback", async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) throw new Error("No code returned from Google");

    const { tokens } = await oauth.getToken(code);
    oauth.setCredentials(tokens);
    req.session.tokens = oauth.credentials;

    const idToken = oauth.credentials.id_token || tokens.id_token;
    if (!idToken) throw new Error("No id_token returned from Google");

    const payload = JSON.parse(
      Buffer.from(idToken.split(".")[1], "base64").toString("utf8")
    );

    req.session.profile = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };

    // ✔ REAL UPSET USER
    await upsertUser(payload.sub, {
      email: payload.email ?? null,
      name: payload.name ?? null,
      picture: payload.picture ?? null,
    });

    const state = typeof req.query.state === "string" ? req.query.state : "";
    const nextUrl =
      state && state.startsWith("/")
        ? `${FRONTEND_ORIGIN}${state}`
        : `${FRONTEND_ORIGIN}?view=books`;

    res.redirect(nextUrl);
  } catch (e) {
    next(e);
  }
});

/* USER APIs */
app.get("/api/me", (req, res) => {
  res.json({ authed: !!req.session?.tokens });
});

app.get("/api/profile", (req, res) => {
  if (!req.session?.profile)
    return res.status(401).json({ error: "not_authed" });
  res.json(req.session.profile);
});

app.post("/api/logout", (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

app.get("/api/user/exists", async (req, res, next) => {
  try {
    const email =
      typeof req.query.email === "string" ? req.query.email.trim() : "";
    if (!email) return res.status(400).json({ error: "missing_email" });

    const exists = await userExistsByEmail(email);
    res.json({ exists });
  } catch (e) {
    next(e);
  }
});

// ----------------------------
// Local users.json store (signup / login) - stored and handled inline
// ----------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_PATH = path.resolve(__dirname, "users.json");

// Attempt to initialize Firestore from a service account JSON if present.
let firestoreClient = null;
try {
  const keyPath = path.resolve(__dirname, "../aivisionstoryjournal-478317-firebase-adminsdk-fbsvc-f19b18ddaa.json");
  if (fs.existsSync(keyPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
    firestoreClient = new Firestore({
      projectId: serviceAccount.project_id,
      credentials: {
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key,
      },
    });
    console.log("Firestore initialized from service account JSON");
  } else {
    console.log("Firestore service account JSON not found, using local users.json fallback");
  }
} catch (e) {
  console.warn("Failed to initialize Firestore, will use local users.json:", e?.message ?? e);
  firestoreClient = null;
}

function readUsers() {
  try {
    if (!fs.existsSync(USERS_PATH)) return [];
    const raw = fs.readFileSync(USERS_PATH, "utf8");
    return JSON.parse(raw || "[]");
  } catch (e) {
    console.error("Error reading users.json", e);
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2), "utf8");
}

// Basic input validation
function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(pw) {
  return typeof pw === "string" && pw.length >= 6;
}

app.post("/api/auth/signup", async (req, res, next) => {
  try {
    const { email, password, name } = req.body || {};
    const trimmed = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!trimmed || !password) return res.status(400).json({ error: "missing_fields" });
    // First check local JSON store for duplicates
  // validate inputs
  if (!isValidEmail(trimmed)) return res.status(400).json({ error: "invalid_email" });
  if (!isValidPassword(password)) return res.status(400).json({ error: "weak_password", reason: "password must be at least 6 characters" });

  // check local JSON for duplicates
  const users = readUsers();
  if (users.find((u) => u.email === trimmed)) return res.status(409).json({ error: "user_exists" });

  const hash = await bcrypt.hash(password, 10);
    const user = {
      email: trimmed,
      name: name || trimmed.split("@")[0],
      passwordHash: hash,
      createdAt: new Date().toISOString(),
      provider: "local",
    };

    // Save locally (fallback)
    users.push(user);
    writeUsers(users);

    // Also write to Firestore if available (non-blocking best-effort)
    if (firestoreClient) {
      try {
        const docId = `local:${trimmed}`;
        // avoid overwriting passwordHash; store public fields
        await firestoreClient.collection("users").doc(docId).set({
          email: user.email,
          name: user.name,
          provider: "local",
          createdAt: user.createdAt,
        }, { merge: true });
      } catch (err) {
        console.warn("Failed to write new user to Firestore:", err?.message ?? err);
      }
    }

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const trimmed = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!trimmed || !password) return res.status(400).json({ error: "missing_fields" });
    if (!isValidEmail(trimmed)) return res.status(400).json({ error: "invalid_email" });

    const users = readUsers();
    const user = users.find((u) => u.email === trimmed);
    if (!user) return res.status(401).json({ error: "invalid_credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash || "");
    if (!ok) return res.status(401).json({ error: "invalid_credentials" });

    // upsert into real DB if available (best-effort)
    try {
      // write to Firestore if configured (alternative to upsertUser)
      if (firestoreClient) {
        const docId = `local:${user.email}`;
        await firestoreClient.collection("users").doc(docId).set({
          email: user.email,
          name: user.name,
          picture: null,
          lastLoginAt: new Date().toISOString(),
          provider: "local",
        }, { merge: true });
      } else {
        await upsertUser(`local:${user.email}`, {
          email: user.email,
          name: user.name,
          picture: null,
        });
      }
    } catch (err) {
      console.warn("upsertUser/Firestore write failed:", err?.message ?? err);
    }

    req.session.profile = {
      sub: `local:${user.email}`,
      email: user.email,
      name: user.name,
      picture: null,
    };

    res.json({ ok: true, profile: req.session.profile });
  } catch (e) {
    next(e);
  }
});

app.get("/api/auth/user", (req, res) => {
  const email = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : "";
  if (!email) return res.status(400).json({ error: "missing_email" });
  const users = readUsers();
  const user = users.find((u) => u.email === email);
  if (!user) return res.status(404).json({ error: "not_found" });
  const { passwordHash, ...safe } = user;
  res.json(safe);
});

/* AI routes */
app.use("/ai", aiRoutes);

app.use((err, _req, res, _next) => {
  console.error("❌ Server error:", err);
  res.status(500).json({ error: "server_error", detail: String(err) });
});

app.use("/api/generate-narrative", generateNarrativeRouter);

app.listen(PORT, () => {
  console.log(`API at http://localhost:${PORT}`);
  console.log(`Frontend origin: ${FRONTEND_ORIGIN}`);
});
