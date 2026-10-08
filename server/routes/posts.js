import { Router } from "express";
import multer from "multer";
import Post from "../models/Post.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
const extractHashtags = text => [...new Set((text.match(/#[a-zA-Z0-9_]+/g) || []).map(tag => tag.slice(1).toLowerCase()))].slice(0, 20);
const populatePost = query => query.populate("author", "name email bio avatarUrl").populate("comments.user", "name avatarUrl");

async function uploadImage(file) {
  if (!file) throw new Error("Image file is required");
  if (!["image/jpeg","image/png","image/webp","image/gif"].includes(file.mimetype)) throw new Error("Only JPG, PNG, WEBP or GIF images are allowed");
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    const { v2: cloudinary } = await import("cloudinary");
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "shivasha/posts", resource_type: "image", transformation: [{ width: 1600, height: 1600, crop: "limit", quality: "auto", fetch_format: "auto" }] },
        (error, result) => error ? reject(error) : resolve(result.secure_url)
      );
      stream.end(file.buffer);
    });
  }
  return "data:" + file.mimetype + ";base64," + file.buffer.toString("base64");
}

router.get("/", requireAuth, async (req, res) => {
  const filter = req.query.hashtag ? { hashtags: String(req.query.hashtag).toLowerCase().replace(/^#/, "") } : {};
  res.json(await populatePost(Post.find(filter).sort({ createdAt: -1 }).limit(50)));
});

router.get("/saved", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).select("savedPosts");
  res.json(await populatePost(Post.find({ _id: { $in: user?.savedPosts || [] } }).sort({ createdAt: -1 })));
});

router.post("/upload", requireAuth, upload.single("image"), async (req, res) => {
  try {
    const imageUrl = await uploadImage(req.file);
    res.status(201).json({ imageUrl, storage: imageUrl.startsWith("data:") ? "database-fallback" : "cloudinary" });
  } catch (error) {
    res.status(400).json({ message: error.message || "Image upload failed" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const text = String(req.body.text || "").trim();
  const imageUrl = String(req.body.imageUrl || "").trim();
  if (!text && !imageUrl) return res.status(400).json({ message: "Post text or image is required" });
  const post = await Post.create({ author: req.user.id, text, imageUrl, hashtags: extractHashtags(text) });
  res.status(201).json(await populatePost(Post.findById(post._id)));
});

router.post("/:id/save", requireAuth, async (req, res) => {
  const [post, user] = await Promise.all([Post.findById(req.params.id), User.findById(req.user.id)]);
  if (!post || !user) return res.status(404).json({ message: "Post not found" });
  const saved = user.savedPosts.some(id => id.toString() === post._id.toString());
  if (saved) user.savedPosts = user.savedPosts.filter(id => id.toString() !== post._id.toString());
  else user.savedPosts.push(post._id);
  await user.save();
  res.json({ saved: !saved });
});

router.post("/:id/like", requireAuth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Post not found" });
  const userId = req.user.id;
  const liked = post.likes.some(id => id.toString() === userId);
  if (liked) post.likes = post.likes.filter(id => id.toString() !== userId);
  else {
    post.likes.push(userId);
    if (post.author.toString() !== userId) await Notification.create({ recipient: post.author, actor: userId, type: "like", post: post._id });
  }
  await post.save();
  res.json(await populatePost(Post.findById(post._id)));
});

router.post("/:id/comments", requireAuth, async (req, res) => {
  const text = String(req.body.text || "").trim();
  if (!text) return res.status(400).json({ message: "Comment is required" });
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Post not found" });
  post.comments.push({ user: req.user.id, text });
  await post.save();
  if (post.author.toString() !== req.user.id) await Notification.create({ recipient: post.author, actor: req.user.id, type: "comment", post: post._id });
  res.json(await populatePost(Post.findById(post._id)));
});

router.delete("/:id", requireAuth, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Post not found" });
  if (post.author.toString() !== req.user.id && !["admin","manager"].includes(req.user.role)) return res.status(403).json({ message: "You cannot delete this post" });
  await post.deleteOne();
  res.json({ success: true, id: req.params.id });
});

export default router;
