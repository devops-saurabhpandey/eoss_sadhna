import { Router } from "express";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).select("-passwordHash");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ user });
});

router.patch("/me", requireAuth, async (req, res) => {
  const allowed = ["name", "bio", "avatarUrl"];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = String(req.body[key]).trim();
  }
  if (updates.name !== undefined && !updates.name) return res.status(400).json({ message: "Name is required" });
  const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true }).select("-passwordHash");
  res.json({ user });
});

router.get("/discover", requireAuth, async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user.id } })
    .select("-passwordHash")
    .sort({ createdAt: -1 })
    .limit(30);
  res.json(users);
});

router.post("/:id/follow", requireAuth, async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ message: "You cannot follow yourself" });
  const target = await User.findById(req.params.id);
  const me = await User.findById(req.user.id);
  if (!target || !me) return res.status(404).json({ message: "User not found" });
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
  res.json({ following: !following, followers: target.followers.length, followingCount: me.following.length });
});

export default router;
