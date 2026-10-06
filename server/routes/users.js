import { Router } from "express";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function requireManager(req, res, next) {
  if (!["admin", "manager"].includes(req.user.role)) {
    return res.status(403).json({ message: "Manager or admin access required" });
  }
  next();
}

router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id).select("-passwordHash");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ user });
});

router.get("/", requireAuth, requireManager, async (_req, res) => {
  const users = await User.find().select("-passwordHash").sort({ createdAt: -1 });
  res.json(users);
});

router.patch("/:id/role", requireAuth, requireManager, async (req, res) => {
  const { role } = req.body;
  if (!["admin", "manager", "employee"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }
  if (req.params.id === req.user.id && role !== "admin") {
    return res.status(400).json({ message: "You cannot remove your own admin access" });
  }
  if (req.user.role === "manager" && role === "admin") {
    return res.status(403).json({ message: "Managers cannot promote users to admin" });
  }
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true, runValidators: true }
  ).select("-passwordHash");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
});

export default router;
