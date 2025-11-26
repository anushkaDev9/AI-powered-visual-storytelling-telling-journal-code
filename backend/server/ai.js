import express from "express";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import vision from "@google-cloud/vision";
import cors from "cors";
import { saveStoryEntry } from "./db.js";
import dotenv from "dotenv";
import sharp from "sharp";
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
// Initialize Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
console.log("Gemini client initialized.");
// Vision client
const visionClient = new vision.ImageAnnotatorClient({
  projectId: GOOGLE_PROJECT_ID,
  keyFilename: GOOGLE_APPLICATION_CREDENTIALS,
});
// Multer memory upload
const upload = multer({ storage: multer.memoryStorage() });
// Middleware to handle both single 'image' and multiple 'images'
const uploadMiddleware = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'images', maxCount: 5 }
]);
// Helper to extract files from request
const getFiles = (req) => {
  if (req.files?.images) return req.files.images;
  if (req.files?.image) return req.files.image;
  return [];
};
// POST /generate-narrative
router.post("/generate-narrative", uploadMiddleware, async (req, res) => {
  try {
    const { lineCount, perspective, tone, context } = req.body;
    const imageFiles = getFiles(req);

    if (!imageFiles || imageFiles.length === 0) {
      return res.status(400).json({ error: "No images uploaded" });
    }
    console.log("\n=== FRONTEND DATA ===", { lineCount, perspective, tone, context, fileCount: imageFiles.length });
    //  Vision API — Label + Object Detection for ALL images
    let allDescriptions = [];
    // Process images in parallel for Vision API
    const visionPromises = imageFiles.map(async (file, index) => {
      const [visionResult] = await visionClient.batchAnnotateImages({
        requests: [
          {
            image: { content: file.buffer },
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
      return `Image ${index + 1}: Labels: ${labels.join(", ")}. Objects: ${objects.join(", ")}.`;
    });
    const descriptions = await Promise.all(visionPromises);
    const combinedDescription = descriptions.join("\n");

    console.log("\n=== VISION OUTPUT ===", combinedDescription);
    // ✍ Build narrative prompt
    let narrativePrompt = `
Write a story in a **${tone}** tone and **${perspective}** person perspective.
The story must be exactly **${lineCount} lines**.
Here is the description of the images provided:
${combinedDescription}
`;
    if (context && context.trim().length > 0) {
      narrativePrompt += `\nAdditional Context provided by user: "${context}"\nUse this context to guide the narrative.\n`;
    }
    narrativePrompt += `
Rules:
- Exactly ${lineCount} lines.
- Each line must be a complete sentence.
- Weave the elements from all images together into a cohesive story.
    `;
    console.log("\n=== PROMPT SENT TO GEMINI ===", narrativePrompt);
    //  Gemini API — Correct multimodal call
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro", // Use a stable and available model identifier
    });
    // Prepare image parts for Gemini
    const imageParts = imageFiles.map(file => ({
      inlineData: {
        mimeType: file.mimetype,
        data: file.buffer.toString("base64"),
      }
    }));
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: narrativePrompt },
            ...imageParts
          ],
        },
      ],
    });
    const text = result.response.text();
    console.log("\n=== STORY GENERATED ===", text);
    // Base64 encode first image for frontend preview (or all if needed, but usually just one is enough for simple return)
    // Actually, frontend already has the images. We just return the narrative.
    // But let's return the first one just in case legacy code needs it.
    const base64 = imageFiles[0].buffer.toString("base64");
    res.json({
      narrative: text,
      imageUrl: `data:${imageFiles[0].mimetype};base64,${base64}`, // Legacy support
      lineCount,
      perspective,
      tone,
    });
  } catch (err) {
    console.error("❌ Generate Narrative Error:", err);
    res.status(500).json({ error: "Generation failed", details: err.message });
  }
});

router.post("/save-entry", uploadMiddleware, async (req, res) => {
  try {
    const userId = req.session?.profile?.sub;
    if (!userId) {
      return res.status(401).json({ error: "User not logged in" });
    }

    const { narrative } = req.body;
    const imageFiles = getFiles(req);

    if (!imageFiles || imageFiles.length === 0) {
      return res.status(400).json({ error: "No images provided" });
    }
    // Process all images
    const processedImages = await Promise.all(imageFiles.map(async (file) => {
      // Convert image to Base64 string (Optimized)
      const optimizedBuffer = await sharp(file.buffer)
        .resize({ width: 800, withoutEnlargement: true }) // Resize to max width 800px
        .jpeg({ quality: 80 }) // Compress to JPEG with 80% quality
        .toBuffer();

      const base64Image = optimizedBuffer.toString("base64");
      return `data:image/jpeg;base64,${base64Image}`;
    }));

    // Save everything in Firestore
    // Note: 'image' field kept for backward compatibility (stores the first image)
    // 'images' field added for multiple images
    await saveStoryEntry(userId, {
      narrative,
      image: processedImages[0], // Primary image
      images: processedImages,   // All images
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Save Entry Error:", err);
    res.status(500).json({ error: "Failed to save entry" });
  }
});
export default router;
