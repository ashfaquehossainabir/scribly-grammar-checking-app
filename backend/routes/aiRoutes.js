import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { analyzeWithAI } from "../utils/aiEngine.js";

const router = express.Router();

router.post("/analyze", protect, async (req, res) => {
  const { text } = req.body;
  if (typeof text !== "string") {
    return res.status(400).json({ message: "text (string) is required" });
  }
  const result = await analyzeWithAI(text);
  res.json(result);
});

export default router;
