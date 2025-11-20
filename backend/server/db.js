
import express from "express";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import vision from "@google-cloud/vision";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();
const router = express.Router();
// ------------------
// Needed for __dirname in ESM
// ------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ----------------------------
// Environment variables
// ----------------------------
const { GEMINI_API_KEY } = process.env;
// Allow frontend
router.use(cors({ origin: "http://localhost:3001" }));
// ----------------------------
// ✅ Initialize Gemini
// ----------------------------
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
// ----------------------------
// ✅ Load Google service account JSON manually
// Correct path: file should exist at backend/aivisionstoryjournal-478317-firebase-adminsdk-fbsvc-f19b18ddaa.json
// ----------------------------
const keyPath = path.resolve(__dirname, "../aivisionstoryjournal-478317-firebase-adminsdk-fbsvc-f19b18ddaa.json");
if (!fs.existsSync(keyPath)) {
  throw new Error(`Service account JSON not found at ${keyPath}`);
}
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));
// ----------------------------
// ✅ Initialize Vision client with credentials
// ----------------------------
const visionClient = new vision.ImageAnnotatorClient({
  credentials: {
    client_email: serviceAccount.client_email,
    private_key: serviceAccount.private_key,
  },
  projectId: serviceAccount.project_id,
});
// ----------------------------
// Multer memory upload
// ----------------------------
const upload = multer({ storage: multer.memoryStorage() });
// =========================================================
//           POST /generate-narrative
// =========================================================
router.post("/generate-narrative", upload.single("image"), async (req, res) => {
  try {
    const { lineCount, perspective, tone } = req.body;
    const imageFile = req.file;
    if (!imageFile) {
      return res.status(400).json({ error: "No image uploaded" });
    }
    console.log("\n=== FRONTEND DATA ===", { lineCount, perspective, tone });
    // ----------------------------
    // 🔍 Vision API — Label + Object Detection
    // ----------------------------
    const [visionResult] = await visionClient.batchAnnotateImages({
      requests: [
        {
          image: { content: imageFile.buffer },
          features: [
            { type: "LABEL_DETECTION" },
            { type: "OBJECT_LOCALIZATION" },
          ],
        },
      ],
    });
    const annotations = visionResult.responses[0];
    const labels = (annotations.labelAnnotations || []).map(l => l.description);
    const objects = (annotations.localizedObjectAnnotations || []).map(o => o.name);
    const description = `Labels: ${labels.join(", ")}. Objects: ${objects.join(", ")}.`;
    console.log("\n=== VISION OUTPUT ===", description);
    // ----------------------------
    // ✍ Build narrative prompt
    // ----------------------------
    const narrativePrompt = `
Write a story in a **${tone}** tone and **${perspective}** person perspective.
The story must be exactly **${lineCount} lines**.
Here is the image description:
${description}
Rules:
- Exactly ${lineCount} lines.
- Each line must be a complete sentence.
    `;
    console.log("\n=== PROMPT SENT TO GEMINI ===", narrativePrompt);
    // ----------------------------
    // 🤖 Gemini API — Correct multimodal call
    // ----------------------------
    const model = genAI.getGenerativeModel({ model: "gemini-1.0" });
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: narrativePrompt },
            {
              inlineData: {
                mimeType: imageFile.mimetype,
                data: imageFile.buffer.toString("base64"), // required by Gemini
              },
            },
          ],
        },
      ],
    });
    const text = result.response.text();
    console.log("\n=== STORY GENERATED ===", text);
    // Base64 encode for frontend
    const base64 = imageFile.buffer.toString("base64");
    res.json({
      narrative: text,
      imageUrl: `data:${imageFile.mimetype};base64,${base64}`,
      lineCount,
      perspective,
      tone,
    });
  } catch (err) {
    console.error("❌ Generate Narrative Error:", err);
    res.status(500).json({ error: "Generation failed", details: err.message });
  }
});
export default router;

//----------- FUNCTIONS -----------

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
