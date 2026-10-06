import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    service: "EOSS Sadhna API",
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "not-connected"
  });
});

app.get("/api", (_req, res) => {
  res.json({ message: "EOSS Sadhna API is running" });
});

async function start() {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("MongoDB connected");
    } else {
      console.log("MONGODB_URI not configured; starting without database");
    }

    app.listen(PORT, () => {
      console.log(`EOSS Sadhna API listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Startup error:", error.message);
    process.exit(1);
  }
}

start();
