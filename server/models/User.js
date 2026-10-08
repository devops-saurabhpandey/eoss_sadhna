import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  bio: { type: String, default: "", trim: true, maxlength: 280 },
  avatarUrl: { type: String, default: "", trim: true },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  role: { type: String, enum: ["admin", "manager", "employee"], default: "employee" }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
