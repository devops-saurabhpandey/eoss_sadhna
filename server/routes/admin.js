import express from "express";
import User from "../models/User.js";
import Post from "../models/Post.js";
import Report from "../models/Report.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);
router.use(async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("role");
    if (!user || user.role !== "admin") return res.status(403).json({ message: "Admin access required" });
    next();
  } catch (error) { next(error); }
});

router.patch("/reports/:id", async (req, res) => {
  const status = String(req.body?.status || "");
  if (!["open", "reviewed", "dismissed"].includes(status)) {
    return res.status(400).json({ message: "Status must be open, reviewed, or dismissed" });
  }
  const report = await Report.findByIdAndUpdate(req.params.id, { status }, { new: true })
    .populate("reporter", "name email").populate("target", "name email avatarUrl");
  if (!report) return res.status(404).json({ message: "Report not found" });
  res.json({ report });
});

router.get("/stats", async (_req, res) => {
  const [users, posts, openReports, allReports] = await Promise.all([
    User.countDocuments(), Post.countDocuments(), Report.countDocuments({ status: "open" }), Report.countDocuments()
  ]);
  res.json({ users, posts, openReports, allReports });
});

router.delete("/posts/:id", async (req, res) => {
  const post = await Post.findByIdAndDelete(req.params.id);
  if (!post) return res.status(404).json({ message: "Post not found" });
  res.json({ deleted: true, postId: req.params.id });
});

router.patch("/users/:id/block", async (req, res) => {
  const blocked = Boolean(req.body?.blocked);
  if (req.params.id === req.user.id) return res.status(400).json({ message: "You cannot moderate your own account" });
  const user = await User.findByIdAndUpdate(req.params.id, { $set: { moderationBlocked: blocked } }, { new: true }).select("_id name");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ user, moderationBlocked: blocked });
});

export default router;
