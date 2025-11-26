// db.js
import { Firestore } from "@google-cloud/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

// Fix ES module dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load JSON manually (this fixes newline issues)
const serviceAccountPath = path.join(__dirname, "..", "aivisionstoryjournal-478317-firebase-adminsdk-fbsvc-f19b18ddaa.json");
const serviceAccountRaw = fs.readFileSync(serviceAccountPath, "utf8");
const serviceAccount = JSON.parse(serviceAccountRaw);

// Fix private key: replace escaped \n with real newlines
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

export const db = new Firestore({
  projectId: serviceAccount.project_id,
  credentials: {
    client_email: serviceAccount.client_email,
    private_key: serviceAccount.private_key,
  },
});

// ----------- FUNCTIONS -----------

export async function upsertUser(sub, data) {
  await db.collection("users").doc(sub).set(
    {
      ...data,
      provider: "google",
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    },
    { merge: true }
  );
}

export async function userExistsByEmail(email) {
  const snap = await db
    .collection("users")
    .where("email", "==", email)
    .limit(1)
    .get();
  return !snap.empty;
}
export async function saveStoryEntry(userId, data) {
  await db
    .collection("users")
    .doc(userId)
    .collection("stories")
    .add({
      ...data,
      createdAt: new Date(),
    });
}
// db.js
export async function getUserStories(userId) {
  const snap = await db
    .collection("users")
    .doc(userId)
    .collection("stories")
    .orderBy("createdAt", "desc")
    .get();

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate?.() ?? null,
  }));
}
// db.js
export async function deleteStoryEntry(userId, storyId) {
  await db
    .collection("users")
    .doc(userId)
    .collection("stories")
    .doc(storyId)
    .delete();
}

export async function createUser(email, passwordHash, name) {
  const userId = crypto.randomUUID();
  await db.collection("users").doc(userId).set({
    email,
    passwordHash,
    name,
    provider: "local",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return userId;
}

export async function getUserByEmail(email) {
  const snap = await db.collection("users").where("email", "==", email).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

// Media Library Functions
export async function saveUserMedia(userId, mediaData) {
  await db
    .collection("users")
    .doc(userId)
    .collection("media")
    .add({
      ...mediaData,
      createdAt: new Date(),
    });
}

export async function getUserMedia(userId) {
  const snap = await db
    .collection("users")
    .doc(userId)
    .collection("media")
    .orderBy("createdAt", "desc")
    .get();

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate?.() ?? null,
  }));
}

export async function deleteUserMedia(userId, mediaId) {
  await db
    .collection("users")
    .doc(userId)
    .collection("media")
    .doc(mediaId)
    .delete();
}
