import express from "express";
import multer from "multer";
import sharp from "sharp";
import { saveUserMedia, getUserMedia } from "./db.js";

const router = express.Router();

// Multer memory upload
const upload = multer({ storage: multer.memoryStorage() });

// ----------------------------
// POST /upload - Upload from device
// ----------------------------
router.post("/upload", upload.single("image"), async (req, res) => {
    try {
        const userId = req.session?.profile?.sub;
        if (!userId) return res.status(401).json({ error: "not_authed" });

        if (!req.file) {
            return res.status(400).json({ error: "No image uploaded" });
        }

        // Resize and compress
        const optimizedBuffer = await sharp(req.file.buffer)
            .resize({ width: 800, withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();

        const base64Image = `data:image/jpeg;base64,${optimizedBuffer.toString("base64")}`;

        // Save to DB
        await saveUserMedia(userId, {
            type: "upload",
            imageUrl: base64Image,
            filename: req.file.originalname,
            mimeType: "image/jpeg",
        });

        res.json({ ok: true });
    } catch (err) {
        console.error("Media Upload Error:", err);
        res.status(500).json({ error: "Upload failed" });
    }
});

// ----------------------------
// POST /import - Import from Google Photos
// ----------------------------
router.post("/import", async (req, res) => {
    try {
        const userId = req.session?.profile?.sub;
        if (!userId) return res.status(401).json({ error: "not_authed" });

        const { googlePhotoId, googleUrl, filename, mimeType } = req.body;

        if (!googleUrl) {
            return res.status(400).json({ error: "Missing Google Photo URL" });
        }

        // We can save the URL directly. 
        // Note: Google Photos URLs might expire or require auth headers to view.
        // Since we are proxying them via /api/drive/image/:id in PhotosPicker, 
        // we should ideally save that proxy URL or the ID.
        // The PhotosPicker passes `baseUrl` which is our proxy URL.

        await saveUserMedia(userId, {
            type: "google_photos",
            imageUrl: googleUrl, // This should be our proxy URL or a permanent link
            googlePhotoId,
            filename: filename || "google-photo.jpg",
            mimeType: mimeType || "image/jpeg",
        });

        res.json({ ok: true });
    } catch (err) {
        console.error("Media Import Error:", err);
        res.status(500).json({ error: "Import failed" });
    }
});

// ----------------------------
// GET /list - List user media
// ----------------------------
router.get("/list", async (req, res) => {
    try {
        const userId = req.session?.profile?.sub;
        if (!userId) return res.status(401).json({ error: "not_authed" });

        const media = await getUserMedia(userId);
        res.json({ items: media });
    } catch (err) {
        console.error("Media List Error:", err);
        res.status(500).json({ error: "Failed to list media" });
    }
});

export default router;
