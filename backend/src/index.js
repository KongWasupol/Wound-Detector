import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/database.js";
import authRoutes from "./routes/authRoutes.js";
import analysisRoutes from "./routes/analysisRoutes.js";

dotenv.config({ override: true });

// Log environment configuration (for debugging)
console.log("[config] CLIENT_URL:", process.env.CLIENT_URL || "http://localhost:5173 (default)");
console.log("[config] BACKEND_URL:", process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4002} (default)`);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { createServer } from "http";
import { Server } from "socket.io";
import doctorRoutes from "./routes/doctorRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";

const app = express();
const httpServer = createServer(app);

const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
const clientOrigin = clientUrl.startsWith("http") ? new URL(clientUrl).origin : clientUrl;

const io = new Server(httpServer, {
  path: "/wound-socket",
  cors: {
    origin: clientOrigin,
    credentials: true,
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Doctor room for notifications
  socket.on("join_doctor_room", () => {
    socket.join("doctors");
    console.log(`Socket ${socket.id} joined doctor room`);
  });

  // Patient room for notifications (using patient ID)
  socket.on("join_patient_room", (patientId) => {
    socket.join(`patient_${patientId}`);
    console.log(`Socket ${socket.id} joined patient room: ${patientId}`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

const healthCheck = (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
};

app.get("/health", healthCheck);
app.get("/", healthCheck);

app.use("/api/auth", authRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/patient", patientRoutes);

app.use((err, _req, res, _next) => {
  console.error("[server] Unhandled error:", err);
  res.status(500).json({ message: err.message || "Server error" });
});

const PORT = process.env.PORT || 4002;

connectDB()
  .then(() => {
    httpServer.listen(PORT, () =>
      console.log(`Server running on http://localhost:${PORT}`)
    );
  })
  .catch(() => process.exit(1));

