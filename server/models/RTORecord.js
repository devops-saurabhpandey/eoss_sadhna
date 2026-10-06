import mongoose from "mongoose";

const rtoRecordSchema = new mongoose.Schema({
  vehicleNo: { type: String, required: true, trim: true, uppercase: true },
  branch: { type: String, required: true, trim: true },
  registrationStatus: { type: String, enum: ["Pending Registration", "In Process", "Completed"], default: "Pending Registration" },
  transactionStatus: { type: String, enum: ["Pending", "Completed"], default: "Pending" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

export default mongoose.model("RTORecord", rtoRecordSchema);
