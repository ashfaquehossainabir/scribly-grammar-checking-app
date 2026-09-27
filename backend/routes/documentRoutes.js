import express from "express";
import Document from "../models/Document.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
router.use(protect);

function computeStats(content) {
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const characters = content.length;
  return { words, characters };
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.get("/", async (req, res) => {
  const { q } = req.query;
  const filter = { owner: req.user._id };
  if (typeof q === "string" && q.trim()) {
    const regex = new RegExp(escapeRegex(q.trim()), "i");
    filter.$or = [{ title: regex }, { content: regex }];
  }
  const docs = await Document.find(filter).sort({ updatedAt: -1 });
  res.json(docs);
});

router.get("/:id", async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, owner: req.user._id });
  if (!doc) return res.status(404).json({ message: "Document not found" });
  res.json(doc);
});

router.post("/", async (req, res) => {
  const { title, content } = req.body;
  const doc = await Document.create({
    owner: req.user._id,
    title: title || "Untitled document",
    content: content || "",
    stats: computeStats(content || ""),
  });
  res.status(201).json(doc);
});

router.put("/:id", async (req, res) => {
  const { title, content, issues } = req.body;
  const update = {};
  if (title !== undefined) update.title = title;
  if (content !== undefined) {
    update.content = content;
    update.stats = { ...computeStats(content), issues: issues ?? 0 };
  }
  const doc = await Document.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    update,
    { new: true }
  );
  if (!doc) return res.status(404).json({ message: "Document not found" });
  res.json(doc);
});

router.delete("/:id", async (req, res) => {
  const doc = await Document.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!doc) return res.status(404).json({ message: "Document not found" });
  res.json({ message: "Deleted" });
});

export default router;
