import express from "express";
import User from "../models/User.js";
import Post from "../models/Post.js";
import Notification from "../models/Notification.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
const publicUser = query => query.select("-passwordHash -savedPosts");

router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).select("-passwordHash");
  res.json({ user });
});

router.patch("/me", requireAuth, async (req, res) => {
  const { name, bio, avatarUrl } = req.body;
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  if (typeof name === "string" && name.trim()) user.name = name.trim();
  if (typeof bio === "string") user.bio = bio.trim().slice(0, 280);
  if (typeof avatarUrl === "string") user.avatarUrl = avatarUrl.trim();
  await user.save();
  res.json({ user: await User.findById(user._id).select("-passwordHash") });
});

router.get("/discover", requireAuth, async (req, res) => {
  const users = await publicUser(User.find({ _id: { $ne: req.user.id } }).sort({ createdAt: -1 }).limit(30));
  res.json(users);
});

router.get("/search", requireAuth, async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (q.length < 2) return res.json([]);
  const users = await publicUser(User.find({
    _id: { $ne: req.user.id },
    $or: [{ name: { $regex: q, $options: "i" } }, { bio: { $regex: q, $options: "i" } }, { email: { $regex: q, $options: "i" } }]
  }).limit(30));
  res.json(users);
});

router.get("/:id", requireAuth, async (req, res) => {
  const user = await publicUser(User.findById(req.params.id));
  if (!user) return res.status(404).json({ message: "User not found" });
  const posts = await Post.find({ author: user._id }).populate("author", "name avatarUrl").sort({ createdAt: -1 }).limit(50);
  const me = await User.findById(req.user.id).select("following");
  res.json({
    user,
    posts,
    isFollowing: me.following.some(id => id.toString() === user._id.toString())
  });
});

router.post("/:id/follow", requireAuth, async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ message: "You cannot follow yourself" });
  const [me, target] = await Promise.all([User.findById(req.user.id), User.findById(req.params.id)]);
  if (!me || !target) return res.status(404).json({ message: "User not found" });
  const following = me.following.some(id => id.toString() === target._id.toString());
  if (following) {
    me.following = me.following.filter(id => id.toString() !== target._id.toString());
    target.followers = target.followers.filter(id => id.toString() !== me._id.toString());
    await Notification.deleteOne({ recipient: target._id, actor: me._id, type: "follow" });
  } else {
    me.following.push(target._id);
    target.followers.push(me._id);
    await Notification.create({ recipient: target._id, actor: me._id, type: "follow" });
  }
  await Promise.all([me.save(), target.save()]);
  res.json({ following: !following });
});

export default router;
