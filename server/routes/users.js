import express from "express";
import User from "../models/User.js";
import Post from "../models/Post.js";
import Notification from "../models/Notification.js";
import Report from "../models/Report.js";
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
  const me = await User.findById(req.user.id).select("following blockedUsers");
  res.json({ user, posts, isFollowing: me.following.some(id => id.toString() === user._id.toString()), isBlocked: me.blockedUsers.some(id => id.toString() === user._id.toString()) });
});

router.get("/:id/connections", requireAuth, async (req, res) => {
  const type = req.query.type === "following" ? "following" : "followers";
  const user = await User.findById(req.params.id).select(type);
  if (!user) return res.status(404).json({ message: "User not found" });
  const ids = user[type] || [];
  const users = await User.find({ _id: { $in: ids } }).select("name bio avatarUrl followers following").limit(100);
  res.json({ type, users });
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
    const n = await Notification.create({ recipient: target._id, actor: me._id, type: "follow" }); req.app.get("io")?.to("user:" + target._id.toString()).emit("notification:new", { notificationId: n._id });
  }
  await Promise.all([me.save(), target.save()]);
  res.json({ following: !following });
});

router.post("/:id/block", requireAuth, async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ message: "You cannot block yourself" });
  const [me, target] = await Promise.all([User.findById(req.user.id), User.findById(req.params.id)]);
  if (!me || !target) return res.status(404).json({ message: "User not found" });
  const exists = me.blockedUsers.some(id => id.toString() === target._id.toString());
  if (exists) me.blockedUsers = me.blockedUsers.filter(id => id.toString() !== target._id.toString());
  else me.blockedUsers.push(target._id);
  await me.save();
  res.json({ blocked: !exists });
});

router.post("/:id/report", requireAuth, async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ message: "You cannot report yourself" });
  const target = await User.findById(req.params.id).select("_id");
  if (!target) return res.status(404).json({ message: "User not found" });
  const reason = String(req.body?.reason || "other").trim().slice(0, 100);
  await Report.create({ reporter: req.user.id, target: target._id, reason });
  res.status(201).json({ reported: true });
});

router.get("/admin/reports", requireAuth, async (req, res) => {
  const me = await User.findById(req.user.id).select("role");
  if (!me || me.role !== "admin") return res.status(403).json({ message: "Admin access required" });
  const reports = await Report.find().populate("reporter", "name email").populate("target", "name email avatarUrl").sort({ createdAt: -1 }).limit(200);
  res.json({ reports });
});

export default router;
