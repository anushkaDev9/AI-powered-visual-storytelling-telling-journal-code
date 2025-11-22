import express from "express";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import vision from "@google-cloud/vision";
import cors from "cors";
import { saveStoryEntry } from "./db.js";
import dotenv from "dotenv";


dotenv.config();

const {
  PORT = 3000,
  SESSION_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI,
  GOOGLE_PROJECT_ID,
  GOOGLE_APPLICATION_CREDENTIALS,
  GEMINI_API_KEY,
  FRONTEND_ORIGIN = "http://localhost:3001",
} = process.env;

const router = express.Router();

// Allow frontend
router.use(cors({ origin: "http://localhost:3001" }));

// ✅ Initialize Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
console.log("Gemini client initialized.");

// Vision client
const visionClient = new vision.ImageAnnotatorClient({
  projectId: GOOGLE_PROJECT_ID,
  keyFilename: GOOGLE_APPLICATION_CREDENTIALS,
});

// Multer memory upload
const upload = multer({ storage: multer.memoryStorage() });

// ----------------------------
// POST /generate-narrative
// ----------------------------
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
 const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro", // Use a stable and available model identifier
    });
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

router.post("/save-entry", upload.single("image"), async (req, res) => {
  try {
    const userId = req.session?.profile?.sub;
    if (!userId) {
      return res.status(401).json({ error: "User not logged in" });
    }

    const { narrative } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({ error: "No image provided" });
    }

    // Convert image to Base64 string
    const base64Image = imageFile.buffer.toString("base64");
    const finalImage = `data:${imageFile.mimetype};base64,${base64Image}`;

    // Save everything in Firestore
    await saveStoryEntry(userId, {
      narrative,
      image: finalImage,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Save Entry Error:", err);
    res.status(500).json({ error: "Failed to save entry" });
  }
});
export default router;
