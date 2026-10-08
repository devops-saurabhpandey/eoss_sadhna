import { Router } from "express";
import Notification from "../models/Notification.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user.id })
    .populate("actor", "name avatarUrl")
    .sort({ createdAt: -1 })
    .limit(50);
  const unread = await Notification.countDocuments({ recipient: req.user.id, read: false });
  res.json({ notifications, unread });
});

router.post("/read", requireAuth, async (req, res) => {
  await Notification.updateMany({ recipient: req.user.id, read: false }, { $set: { read: true } });
  res.json({ success: true });
});

export default router;
