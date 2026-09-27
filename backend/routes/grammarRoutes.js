import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { checkText } from "../utils/grammarChecker.js";

const router = express.Router();

router.post("/check", protect, async (req, res) => {
  const { text } = req.body;
  if (typeof text !== "string") {
    return res.status(400).json({ message: "text (string) is required" });
  }
  const result = await checkText(text);
  res.json(result);
});

export default router;
