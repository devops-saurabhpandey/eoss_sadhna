import { Router } from "express";
import Post from "../models/Post.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const populatePost = (query) => query
  .populate("author", "name email bio avatarUrl")
  .populate("comments.user", "name avatarUrl");

router.get("/", requireAuth, async (_req, res) => {
  const posts = await populatePost(Post.find().sort({ createdAt: -1 }).limit(50));
  res.json(posts);
});

router.post("/", requireAuth, async (req, res) => {
  const text = String(req.body.text || "").trim();
  const imageUrl = String(req.body.imageUrl || "").trim();
  if (!text && !imageUrl) return res.status(400).json({ message: "Post text or image is required" });
  const post = await Post.create({ author: req.user.id, text, imageUrl });
  const result = await populatePost(Post.findById(post._id));
  res.status(201).json(result);
});

router.post("/:id/like", requireAuth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Post not found" });
  const userId = req.user.id;
  const liked = post.likes.some(id => id.toString() === userId);
  if (liked) post.likes = post.likes.filter(id => id.toString() !== userId);
  else post.likes.push(userId);
  await post.save();
  const result = await populatePost(Post.findById(post._id));
  res.json(result);
});

router.post("/:id/comments", requireAuth, async (req, res) => {
  const text = String(req.body.text || "").trim();
  if (!text) return res.status(400).json({ message: "Comment is required" });
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Post not found" });
  post.comments.push({ user: req.user.id, text });
  await post.save();
  const result = await populatePost(Post.findById(post._id));
  res.json(result);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Post not found" });
  if (post.author.toString() !== req.user.id && !["admin","manager"].includes(req.user.role)) {
    return res.status(403).json({ message: "You cannot delete this post" });
  }
  await post.deleteOne();
  res.json({ success: true, id: req.params.id });
});

export default router;
