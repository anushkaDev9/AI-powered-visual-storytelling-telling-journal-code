import express from "express";
import session from "cookie-session";
import cors from "cors";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";
import aiRoutes from "./ai.js";
import { upsertUser, userExistsByEmail } from "./db.js";   // ✅ REAL DB FUNCTIONS
import generateNarrativeRouter from "./ai.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getUserStories,deleteStoryEntry } from "./db.js";


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
];

const DRIVE_SCOPES = [
  "openid",
  "email", 
  "profile",
  "https://www.googleapis.com/auth/drive.readonly",
];

// Google Drive API endpoints for images
// - GET /google/drive/images -> lists image files from Drive
// - GET /google/drive/images/:id -> returns a single image file
app.get('/google/drive/images', async (req, res, next) => {
  try {
    if (!req.session?.tokens) return res.status(401).json({ error: 'not_authed' });

    oauth.setCredentials(req.session.tokens);
    const { token } = await oauth.getAccessToken();
    const accessToken = token || oauth.credentials.access_token;

    const pageSize = Math.min(100, Number(req.query.pageSize) || 20);
    
    // Search for image files in Google Drive
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', "mimeType contains 'image/' and trashed=false");
    url.searchParams.set('pageSize', String(pageSize));
    url.searchParams.set('fields', 'files(id,name,mimeType,webViewLink,thumbnailLink,createdTime),nextPageToken');
    url.searchParams.set('orderBy', 'createdTime desc');

    const resp = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({ error: 'google_drive_error', detail: text });
    }

    const data = await resp.json();
    const items = (data.files || []).map((file) => ({
      id: file.id,
      filename: file.name,
      mimeType: file.mimeType,
      baseUrl: `http://localhost:3000/api/drive/image/${file.id}`, // Proxy through our server
      productUrl: file.webViewLink,
      mediaMetadata: {
        creationTime: file.createdTime
      },
    }));

    res.json({ items, nextPageToken: data.nextPageToken || null });
  } catch (e) {
    next(e);
  }
});

// Proxy endpoint to serve Google Drive images with authentication
app.get('/api/drive/image/:fileId', async (req, res, next) => {
  try {
    if (!req.session?.tokens) {
      return res.status(401).json({ error: 'not_authed' });
    }

    const { fileId } = req.params;
    oauth.setCredentials(req.session.tokens);
    const { token } = await oauth.getAccessToken();
    const accessToken = token || oauth.credentials.access_token;

    // Get file metadata first
    const metadataUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=mimeType,thumbnailLink`;
    const metadataResp = await fetch(metadataUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!metadataResp.ok) {
      return res.status(404).json({ error: 'file_not_found' });
    }

    const metadata = await metadataResp.json();

    // Try thumbnail first, then fallback to direct download
    let imageUrl = metadata.thumbnailLink;
    if (!imageUrl) {
      imageUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    }

    // Fetch the image
    const imageResp = await fetch(imageUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!imageResp.ok) {
      return res.status(404).json({ error: 'image_not_found' });
    }

    // Set appropriate headers and pipe the image
    res.set('Content-Type', metadata.mimeType || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Stream the image response
    const buffer = await imageResp.arrayBuffer();
    res.send(Buffer.from(buffer));

  } catch (e) {
    console.error('Drive image proxy error:', e);
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

// Frontend-compatible auth entrypoint used by CreateEntry button
app.get('/photos/auth', (req, res) => {
  const state = typeof req.query.next === 'string' ? req.query.next : '';
  
  // Only request the Drive scope for photos
  const driveOnlyScopes = [
    "https://www.googleapis.com/auth/drive.readonly",
  ];
  
  const url = oauth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'select_account',
    scope: driveOnlyScopes,
    state,
    include_granted_scopes: true,
  });
  res.redirect(url);
});

// Frontend endpoint expected by PhotosPicker component
app.get('/api/photos/recent', async (req, res, next) => {
  try {
    if (!req.session?.tokens) {
      console.log('No tokens in session');
      return res.status(401).json({ error: 'not_authed' });
    }

    console.log('Session tokens:', Object.keys(req.session.tokens));
    
    // Check if we have the drive scope in our tokens
    const storedTokens = req.session.tokens;
    const hasRefreshToken = !!storedTokens.refresh_token;
    const hasAccessToken = !!storedTokens.access_token;
    
    console.log('Has refresh token:', hasRefreshToken);
    console.log('Has access token:', hasAccessToken);
    
    // If we don't have tokens with drive scope, request auth
    if (!hasRefreshToken && !hasAccessToken) {
      console.log('No valid tokens found, requesting auth');
      return res.status(403).json({ 
        error: 'drive_scope_missing', 
        detail: 'Google Drive access not granted',
        needsAuth: true
      });
    }

    oauth.setCredentials(storedTokens);
    
    // Check if we have drive scope by attempting to get access token
    let accessToken;
    try {
      const { token } = await oauth.getAccessToken();
      accessToken = token || oauth.credentials.access_token;
      console.log('Got access token successfully');
    } catch (err) {
      console.log('Failed to get access token:', err.message);
      // Clear invalid tokens and request re-auth
      req.session.tokens = null;
      return res.status(403).json({ 
        error: 'drive_scope_missing', 
        detail: 'Google Drive access not granted',
        needsAuth: true
      });
    }

    const pageSize = Math.min(100, Number(req.query.pageSize) || 20);
    
    // Search for image files in Google Drive
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', "mimeType contains 'image/' and trashed=false");
    url.searchParams.set('pageSize', String(pageSize));
    url.searchParams.set('fields', 'files(id,name,mimeType,webViewLink,thumbnailLink,createdTime),nextPageToken');
    url.searchParams.set('orderBy', 'createdTime desc');

    console.log('Making request to Google Drive API for images...');
    const resp = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    console.log('Google Drive API response status:', resp.status);

    if (!resp.ok) {
      const text = await resp.text();
      console.log('Google Drive API error:', resp.status, text);
      
      if (resp.status === 403 || resp.status === 401) {
        // Clear tokens and request re-auth
        req.session.tokens = null;
        return res.status(403).json({ 
          error: 'drive_scope_missing', 
          detail: 'Google Drive access not granted',
          needsAuth: true
        });
      }
      return res.status(resp.status).json({ error: 'google_drive_error', detail: text });
    }

    const data = await resp.json();
    console.log('Found', data.files?.length || 0, 'images in Drive');
    
    // Convert Drive files to format expected by PhotosPicker
    const items = (data.files || []).map((file) => ({
      id: file.id,
      filename: file.name,
      mimeType: file.mimeType,
      baseUrl: `http://localhost:3000/api/drive/image/${file.id}`, // Proxy through our server
      productUrl: file.webViewLink,
      mediaMetadata: {
        creationTime: file.createdTime
      },
    }));

    res.json({ items, nextPageToken: data.nextPageToken || null });
  } catch (e) {
    console.error('Drive API error:', e);
    next(e);
  }
});

// OAuth start endpoint — builds Google consent URL and redirects
app.get('/google', (req, res) => {
  const state = typeof req.query.next === 'string' ? req.query.next : '';
  const url = oauth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: BASE_SCOPES,
    state,
  });
  res.redirect(url);
});

// OAuth callback that Google redirects back to — save tokens and profile to session
app.get('/google/callback', async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) throw new Error('No code returned from Google');

    console.log('OAuth callback - getting tokens...');
    const { tokens } = await oauth.getToken(code);
    
    // Merge new tokens with existing session tokens (for incremental auth)
    const existingTokens = req.session.tokens || {};
    const mergedTokens = { ...existingTokens, ...tokens };
    
    console.log('Existing tokens:', Object.keys(existingTokens));
    console.log('New tokens:', Object.keys(tokens));
    console.log('Merged tokens:', Object.keys(mergedTokens));
    
    oauth.setCredentials(mergedTokens);
    req.session.tokens = oauth.credentials;

    const idToken = oauth.credentials.id_token || tokens.id_token;
    if (!idToken) throw new Error('No id_token returned from Google');

    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString('utf8'));

    req.session.profile = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };

    // Persist user in your DB
    await upsertUser(payload.sub, {
      email: payload.email ?? null,
      name: payload.name ?? null,
      picture: payload.picture ?? null,
    });

    const state = typeof req.query.state === 'string' ? req.query.state : '';

    // Determine redirect target:
    let nextUrl;
    if (state) {
      // If state is a full URL (starts with http) use it directly
      if (state.startsWith('http://') || state.startsWith('https://')) {
        nextUrl = state;
      } else {
        // try decoding (in case it was encoded when passed)
        try {
          const decoded = decodeURIComponent(state);
          if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
            nextUrl = decoded;
          } else if (decoded.startsWith('/')) {
            nextUrl = `${FRONTEND_ORIGIN}${decoded}`;
          } else {
            // fallback: treat as path
            nextUrl = `${FRONTEND_ORIGIN}${decoded.startsWith('/') ? decoded : `/${decoded}`}`;
          }
        } catch (err) {
          // decoding failed, fallback to FRONTEND_ORIGIN
          nextUrl = `${FRONTEND_ORIGIN}?view=books`;
        }
      }
    } else {
      nextUrl = `${FRONTEND_ORIGIN}?view=books`;
    }

    console.log('OAuth callback redirecting to:', nextUrl);

    res.redirect(nextUrl);
  } catch (e) {
    next(e);
  }
});

app.use((err, _req, res, _next) => {
  console.error("❌ Server error:", err);
  res.status(500).json({ error: "server_error", detail: String(err) });
});

app.use("/api/generate-narrative", generateNarrativeRouter);
//get the list of stories for the authenticated user
app.get("/api/stories", async (req, res) => {
  try {
    const userId = req.session?.profile?.sub;
    if (!userId) return res.status(401).json({ error: "not_authed" });

    const stories = await getUserStories(userId);
    res.json({ stories });
  } catch (e) {
    console.error("List stories error:", e);
    res.status(500).json({ error: "server_error" });
  }
});

app.delete("/api/story/:id", async (req, res) => {
  try {
    const userId = req.session?.profile?.sub;
    if (!userId) return res.status(401).json({ error: "not_authed" });

    await deleteStoryEntry(userId, req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "delete_failed" });
  }
});
app.listen(PORT, () => {
  console.log(`API at http://localhost:${PORT}`);
  console.log(`Frontend origin: ${FRONTEND_ORIGIN}`);
});
