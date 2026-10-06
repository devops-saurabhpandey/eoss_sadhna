import { Router } from "express";
import RTORecord from "../models/RTORecord.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const filter = ["admin", "manager"].includes(req.user.role) ? {} : { createdBy: req.user.id };
    const records = await RTORecord.find(filter).sort({ createdAt: -1 });
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

    const filter = ["admin", "manager"].includes(req.user.role)
      ? { _id: req.params.id }
      : { _id: req.params.id, createdBy: req.user.id };

    const record = await RTORecord.findOneAndUpdate(filter, updates, {
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
    const filter = ["admin", "manager"].includes(req.user.role)
      ? { _id: req.params.id }
      : { _id: req.params.id, createdBy: req.user.id };
    const record = await RTORecord.findOneAndDelete(filter);
    if (!record) return res.status(404).json({ message: "RTO record not found" });
    res.json({ message: "RTO record deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete RTO record", error: error.message });
  }
});

export default router;
