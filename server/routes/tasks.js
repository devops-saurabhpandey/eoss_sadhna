import { Router } from "express";
import Task from "../models/Task.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

function canManageAll(req) {
  return ["admin", "manager"].includes(req.user.role);
}

router.get("/", async (req, res) => {
  try {
    const filter = canManageAll(req) ? {} : { createdBy: req.user.id };
    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Failed to load tasks", error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { title, description = "", priority = "medium", dueDate = null } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: "Task title is required" });

    const task = await Task.create({
      title: title.trim(),
      description,
      priority,
      dueDate: dueDate || null,
      createdBy: req.user.id
    });
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: "Failed to create task", error: error.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const allowed = ["title", "description", "status", "priority", "dueDate"];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => allowed.includes(key))
    );

    const filter = canManageAll(req) ? { _id: req.params.id } : { _id: req.params.id, createdBy: req.user.id };
    const task = await Task.findOneAndUpdate(
      filter,
      updates,
      { new: true, runValidators: true }
    );

    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: "Failed to update task", error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const filter = canManageAll(req) ? { _id: req.params.id } : { _id: req.params.id, createdBy: req.user.id };
    const task = await Task.findOneAndDelete(filter);
    if (!task) return res.status(404).json({ message: "Task not found" });
    res.json({ message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete task", error: error.message });
  }
});

export default router;
