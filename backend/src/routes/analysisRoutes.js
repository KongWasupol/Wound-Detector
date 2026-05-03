import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { authenticate } from "../middleware/auth.js";
import { Analysis } from "../models/Analysis.js";
import { analyzeWound } from "../services/aiService.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, "../../uploads");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `wound-${timestamp}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed"));
    }
    cb(null, true);
  },
});

router.post("/upload", authenticate, upload.single("image"), async (req, res) => {
  try {
    const { notes = "", model = "gpt-4o", symptomId } = req.body;
    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    const analysisResult = await analyzeWound({
      imagePath: req.file.path,
      notes,
      model,
    });

    const record = await Analysis.create({
      user: req.user._id,
      provider: "openai",
      model: model || "gpt-4o",
      imagePath: req.file.path,
      imageOriginalName: req.file.originalname,
      notes,
      symptomId: symptomId || undefined,
      ...analysisResult,
    });

    const io = req.app.get("io");
    if (io) {
      io.to("doctors").emit("analysis_created", {
        patientName: req.user.name,
        analysisId: record._id,
        severity: record.severityScore,
      });
    }

    res.status(201).json(record);
  } catch (error) {
    console.error("[analysis] upload error:", error.message);
    res.status(500).json({ message: error.message || "Upload failed" });
  }
});

router.get("/history", authenticate, async (req, res) => {
  const data = await Analysis.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(20);
  res.json(data);
});

router.get("/summary", authenticate, async (req, res) => {
  const [stats] = await Analysis.aggregate([
    { $match: { user: req.user._id } },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        avgSeverity: { $avg: "$severityScore" },
        recentModels: { $push: "$model" },
      },
    },
  ]);

  res.json({
    totalAnalyses: stats?.count || 0,
    averageSeverity: Math.round(stats?.avgSeverity || 0),
    providerMix: stats?.recentModels?.filter(Boolean).slice(-5) || [],
  });
});

router.get("/progress/:symptomId", authenticate, async (req, res) => {
  try {
    const { symptomId } = req.params;
    const analyses = await Analysis.find({
      user: req.user._id,
      $or: [
        { symptomId },
        { _id: symptomId },
      ],
    })
      .sort({ createdAt: 1 })
      .select("severityScore createdAt _id");

    const progress = analyses.map((a) => ({
      date: a.createdAt.toISOString(),
      severity: a.severityScore,
      analysisId: a._id.toString(),
    }));

    res.json(progress);
  } catch (error) {
    console.error("[analysis] progress error:", error.message);
    res.status(500).json({ message: "Failed to fetch progress" });
  }
});

export default router;

