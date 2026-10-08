import mongoose from "mongoose";
import { Router } from "express";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const populateConversation = query =>
  query
    .populate("participants", "name avatarUrl bio")
    .populate("lastMessage", "sender text createdAt");

router.get("/conversations", requireAuth, async (req, res) => {
  const conversations = await populateConversation(
    Conversation.find({ participants: req.user.id }).sort({ updatedAt: -1 })
  );
  const unreadRows = await Message.aggregate([
    { $match: { conversation: { $in: conversations.map(c => c._id) }, sender: { $ne: new mongoose.Types.ObjectId(req.user.id) }, readBy: { $ne: new (await import("mongoose")).default.Types.ObjectId(req.user.id) } } },
    { $group: { _id: "$conversation", count: { $sum: 1 } } }
  ]);
  const counts = new Map(unreadRows.map(row => [row._id.toString(), row.count]));
  res.json(conversations.map(c => ({ ...c.toObject(), unreadCount: counts.get(c._id.toString()) || 0 })));
});

router.post("/conversations", requireAuth, async (req, res) => {
  const otherId = String(req.body.userId || "");
  if (!otherId || otherId === req.user.id) return res.status(400).json({ message: "Valid userId is required" });

  const other = await User.findById(otherId).select("_id");
  if (!other) return res.status(404).json({ message: "User not found" });

  let conversation = await Conversation.findOne({
    participants: { $all: [req.user.id, otherId] },
    $expr: { $eq: [{ $size: "$participants" }, 2] }
  });

  if (!conversation) {
    conversation = await Conversation.create({ participants: [req.user.id, otherId] });
  }

  res.json(await populateConversation(Conversation.findById(conversation._id)));
});

router.get("/conversations/:id/messages", requireAuth, async (req, res) => {
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    participants: req.user.id
  });
  if (!conversation) return res.status(404).json({ message: "Conversation not found" });

  const messages = await Message.find({ conversation: conversation._id })
    .populate("sender", "name avatarUrl")
    .sort({ createdAt: 1 })
    .limit(200);

  res.json(messages);
});

router.post("/conversations/:id/messages", requireAuth, async (req, res) => {
  const text = String(req.body.text || "").trim();
  if (!text) return res.status(400).json({ message: "Message is required" });

  const conversation = await Conversation.findOne({
    _id: req.params.id,
    participants: req.user.id
  });
  if (!conversation) return res.status(404).json({ message: "Conversation not found" });

  const message = await Message.create({
    conversation: conversation._id,
    sender: req.user.id,
    text,
    readBy: [req.user.id]
  });

  conversation.lastMessage = message._id;
  conversation.updatedAt = new Date();
  await conversation.save();

  const populated = await Message.findById(message._id).populate("sender", "name avatarUrl");
  const io = req.app.get("io");
  if (io) {
    conversation.participants
      .map(id => id.toString())
      .filter(id => id !== req.user.id.toString())
      .forEach(id => io.to("user:" + id).emit("message:new", populated));
  }

  res.status(201).json(populated);
});

router.post("/conversations/:id/read", requireAuth, async (req, res) => {
  const conversation = await Conversation.findOne({
    _id: req.params.id,
    participants: req.user.id
  });
  if (!conversation) return res.status(404).json({ message: "Conversation not found" });

  await Message.updateMany(
    { conversation: conversation._id, sender: { $ne: req.user.id }, readBy: { $ne: req.user.id } },
    { $addToSet: { readBy: req.user.id } }
  );

  res.json({ success: true });
});

export default router;
