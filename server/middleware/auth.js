import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: "Authentication required" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(req.user.id).select("moderationBlocked");
    if (!user) return res.status(401).json({ message: "Account not found" });
    if (user.moderationBlocked) return res.status(403).json({ message: "This account is temporarily restricted" });
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
