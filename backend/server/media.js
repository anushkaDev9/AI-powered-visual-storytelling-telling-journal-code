import express from "express";
import multer from "multer";
import sharp from "sharp";
import { saveUserMedia, getUserMedia, deleteUserMedia } from "./db.js";

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

        if (!req.session?.tokens) {
            return res.status(401).json({ error: "not_authed - no tokens" });
        }

        const { googlePhotoId, googleUrl, filename, mimeType } = req.body;

        if (!googlePhotoId) {
            return res.status(400).json({ error: "Missing Google Photo ID" });
        }

        // Get access token from session
        const accessToken = req.session.tokens.access_token;

        // Fetch image directly from Google Drive API
        const imageUrl = `https://www.googleapis.com/drive/v3/files/${googlePhotoId}?alt=media`;
        const protocol = await import('https');

        const imageBuffer = await new Promise((resolve, reject) => {
            const options = {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            };

            protocol.default.get(imageUrl, options, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to fetch image: ${response.statusCode}`));
                    return;
                }

                const chunks = [];
                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () => resolve(Buffer.concat(chunks)));
                response.on('error', reject);
            }).on('error', reject);
        });

        // Resize and compress like we do for uploads
        const optimizedBuffer = await sharp(imageBuffer)
            .resize({ width: 800, withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();

        const base64Image = `data:image/jpeg;base64,${optimizedBuffer.toString("base64")}`;

        await saveUserMedia(userId, {
            type: "google_photos",
            imageUrl: base64Image,
            googlePhotoId,
            filename: filename || "google-photo.jpg",
            mimeType: "image/jpeg",
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

// ----------------------------
// DELETE /delete/:id - Delete media item
// ----------------------------
router.delete("/delete/:id", async (req, res) => {
    try {
        const userId = req.session?.profile?.sub;
        if (!userId) return res.status(401).json({ error: "not_authed" });

        const { id } = req.params;
        await deleteUserMedia(userId, id);
        res.json({ ok: true });
    } catch (err) {
        console.error("Media Delete Error:", err);
        res.status(500).json({ error: "Failed to delete media" });
    }
});

export default router;
