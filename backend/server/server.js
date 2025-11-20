import express from "express";
import session from "cookie-session";
import cors from "cors";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";
import aiRoutes from "./ai.js";
import { upsertUser, userExistsByEmail } from "./db.js";   // ✅ REAL DB FUNCTIONS
import generateNarrativeRouter from "./ai.js";
import { GoogleGenerativeAI } from "@google/generative-ai";



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
