import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, default: "Untitled document", trim: true },
    content: { type: String, default: "" },
    stats: {
      words: { type: Number, default: 0 },
      characters: { type: Number, default: 0 },
      issues: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Document", documentSchema);
