import express from "express";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import vision from "@google-cloud/vision";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const { GOOGLE_PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS, GEMINI_API_KEY } = process.env;

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

    console.log("\n=== FRONTEND DATA ===");
    console.log({ lineCount, perspective, tone });

    // 🔍 Vision AI Analysis
    // NOTE: This call is the most common point of failure for credential/permission errors.
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
    console.log("\n=== VISION OUTPUT ===");
    console.log(description);

    // ✍ Build narrative prompt
    // FIX: This is where 'narrativePrompt' is defined, preventing the ReferenceError.
    const narrativePrompt = `
Write a story using a **${tone}** tone and **${perspective}** perspective.
Make it exactly **${lineCount} lines**.

Image description:
${description}

Rules:
- Do not exceed ${lineCount} lines.
- Each line must be a complete sentence.
    `;

    console.log("\n=== PROMPT SENT TO GEMINI ===");
    console.log(narrativePrompt);

    // FIX: Define 'model', preventing the ReferenceError and using the correct model ID.
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro", // Use a stable and available model identifier
    });

    // FIX: Convert the image buffer to a Base64 string for the API call and frontend.
    const base64Image = imageFile.buffer.toString("base64");

    let text = "";

    /* // OPTIONAL SUGGESTION: Robust Retry Mechanism for 503 Errors
    const MAX_RETRIES = 3;
    let attempt = 0;
    
    while (attempt < MAX_RETRIES) {
        try {
            console.log(`Attempting Gemini generation (Attempt ${attempt + 1})...`);
    */

    // 🤖 Gemini Generation
    const result = await model.generateContent([
      { text: narrativePrompt },
      {
        inlineData: {
          data: base64Image,       // Base64 string fix
          mimeType: imageFile.mimetype
        }
      }
    ]);

    text = await result.response.text();
    /*
            break; // Exit the loop on success
            
        } catch (err) {
            attempt++;
            // Check specifically for 503 errors
            if (attempt < MAX_RETRIES && err.status === 503) {
                const delay = 2 ** attempt * 1000; // Exponential backoff
                console.warn(`Model overloaded (503). Retrying in ${delay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw err; // Re-throw if it's the last attempt or a different error
            }
        }
    }
    */


    console.log("\n=== STORY GENERATED ===");
    console.log(text);

    res.json({
      narrative: text,
      // FIX: Use 'base64Image' instead of the undefined 'base64'.
      imageUrl: `data:${imageFile.mimetype};base64,${base64Image}`,
      lineCount,
      perspective,
      tone
    });

  } catch (err) {
    console.error("❌ Generate Narrative Error:", err);
    res.status(500).json({ error: "Generation failed", details: err.message });
  }
});

export default router;