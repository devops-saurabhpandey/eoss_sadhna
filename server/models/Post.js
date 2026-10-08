import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true, trim: true, maxlength: 500 }
}, { timestamps: true });

const postSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, default: "", trim: true, maxlength: 2000 },
  imageUrl: { type: String, default: "", trim: true },
  hashtags: [{ type: String, trim: true, lowercase: true, maxlength: 50 }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comments: [commentSchema]
}, { timestamps: true });

postSchema.index({ createdAt: -1 });
postSchema.index({ hashtags: 1, createdAt: -1 });

export default mongoose.model("Post", postSchema);
