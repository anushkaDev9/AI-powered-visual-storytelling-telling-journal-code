// auth.js — kept for backward-compatibility but now unused.
// Auth routes were inlined into server.js. This file intentionally exports
// an empty router so old imports won't break if referenced elsewhere.
import express from "express";
const router = express.Router();
export default router;
