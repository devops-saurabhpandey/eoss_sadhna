import { Router } from "express";
import RTORecord from "../models/RTORecord.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const records = await RTORecord.find().sort({ createdAt: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: "Failed to load RTO records", error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { vehicleNo, branch, registrationStatus = "Pending Registration", transactionStatus = "Pending" } = req.body;
    if (!vehicleNo?.trim() || !branch?.trim()) {
      return res.status(400).json({ message: "Vehicle number and branch are required" });
    }

    const record = await RTORecord.create({
      vehicleNo: vehicleNo.trim().toUpperCase(),
      branch: branch.trim(),
      registrationStatus,
      transactionStatus,
      createdBy: req.user.id
    });

    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: "Failed to create RTO record", error: error.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const allowed = ["vehicleNo", "branch", "registrationStatus", "transactionStatus"];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => allowed.includes(key))
    );

    const record = await RTORecord.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });

    if (!record) return res.status(404).json({ message: "RTO record not found" });
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: "Failed to update RTO record", error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const record = await RTORecord.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: "RTO record not found" });
    res.json({ message: "RTO record deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete RTO record", error: error.message });
  }
});

export default router;
