import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import postRoutes from "./routes/posts.js";
import notificationRoutes from "./routes/notifications.js";
import messageRoutes from "./routes/messages.js";
import adminRoutes from "./routes/admin.js";

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;
const allowedOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(",").map(origin => origin.trim()) : "*";

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

const onlineUsers = new Map();

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"] }
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token || !process.env.JWT_SECRET) return next(new Error("Authentication required"));
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error("Invalid authentication token"));
  }
});

io.on("connection", socket => {
  const userId = socket.user.id.toString();
  socket.join("user:" + userId);
  onlineUsers.set(userId, (onlineUsers.get(userId) || 0) + 1);
  socket.emit("realtime:ready", { userId });
  socket.emit("presence:list", { userIds: [...onlineUsers.keys()] });
  socket.broadcast.emit("presence:online", { userId });

  socket.on("presence:heartbeat", () => socket.emit("presence:pong", { at: Date.now() }));
  socket.on("typing:start", ({ conversationId } = {}) => { if (conversationId) socket.to("conversation:" + conversationId).emit("typing:start", { userId, conversationId }); });
  socket.on("typing:stop", ({ conversationId } = {}) => { if (conversationId) socket.to("conversation:" + conversationId).emit("typing:stop", { userId, conversationId }); });
  socket.on("conversation:join", ({ conversationId } = {}) => { if (conversationId) socket.join("conversation:" + conversationId); });
  socket.on("conversation:leave", ({ conversationId } = {}) => { if (conversationId) socket.leave("conversation:" + conversationId); });

  socket.on("disconnect", () => {
    const count = Math.max((onlineUsers.get(userId) || 1) - 1, 0);
    if (count === 0) { onlineUsers.delete(userId); socket.broadcast.emit("presence:offline", { userId }); }
    else onlineUsers.set(userId, count);
  });
});

app.set("io", io);

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    service: "SHIVASHA API",
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "not-connected",
    realtime: true
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api", (_req, res) => res.json({ message: "SHIVASHA API is running" }));

async function start() {
  try {
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required");
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("MongoDB connected");
    } else {
      console.log("MONGODB_URI not configured; starting without database");
    }
    httpServer.listen(PORT, () => console.log(`SHIVASHA API listening on port ${PORT}`));
  } catch (error) {
    console.error("Startup error:", error.message);
    process.exit(1);
  }
}

start();
