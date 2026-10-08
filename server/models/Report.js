import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  target: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reason: { type: String, required: true, maxlength: 100 },
  status: { type: String, enum: ["open", "reviewed", "dismissed"], default: "open" }
}, { timestamps: true });

export default mongoose.model("Report", reportSchema);
