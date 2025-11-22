import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Firestore } from "@google-cloud/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_PATH = path.resolve(__dirname, "users.json");
const KEY_PATH = path.resolve(__dirname, "../aivisionstoryjournal-478317-firebase-adminsdk-fbsvc-f19b18ddaa.json");

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

async function main() {
  if (!fs.existsSync(KEY_PATH)) {
    console.error("Service account JSON not found at", KEY_PATH);
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(KEY_PATH, "utf8"));
  const firestore = new Firestore({
    projectId: serviceAccount.project_id,
    credentials: {
      client_email: serviceAccount.client_email,
      private_key: serviceAccount.private_key,
    },
  });

  const users = readUsers();
  if (!users.length) {
    console.log("No users to migrate (users.json empty or missing)");
    process.exit(0);
  }

  console.log(`Migrating ${users.length} users to Firestore...`);
  let count = 0;
  for (const u of users) {
    try {
      const docId = `local:${u.email}`;
      await firestore.collection("users").doc(docId).set({
        email: u.email,
        name: u.name,
        provider: u.provider || "local",
        createdAt: u.createdAt || new Date().toISOString(),
      }, { merge: true });
      count++;
    } catch (e) {
      console.error("failed to write user", u.email, e?.message ?? e);
    }
  }

  console.log(`Migration complete: ${count}/${users.length} users written to Firestore`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
