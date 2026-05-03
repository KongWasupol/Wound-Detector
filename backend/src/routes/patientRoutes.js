import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { authenticate } from "../middleware/auth.js";
import { Wound } from "../models/Wound.js";
import { Analysis } from "../models/Analysis.js";
import { TrackRequest } from "../models/TrackRequest.js";
import { User } from "../models/User.js";
import { analyzeWound } from "../services/aiService.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, "../../uploads");

// Multer configuration
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

// ==================== WOUND ROUTES ====================

// Create new wound with initial image
router.post("/wounds", authenticate, upload.single("image"), async (req, res) => {
    try {
        const { name, bodyPart, description, notes = "", model = "gpt-4o" } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: "Initial wound image is required" });
        }

        // Analyze the wound image with AI
        const analysisResult = await analyzeWound({
            imagePath: req.file.path,
            notes,
            model,
        });

        // Extract just the filename for relative path storage
        const filename = req.file.filename || req.file.path.split(/[/\\]/).pop();
        const relativePath = `uploads/${filename}`;

        // Create the wound
        const wound = await Wound.create({
            patient: req.user._id,
            name: name || `Wound ${Date.now()}`,
            bodyPart,
            woundType: analysisResult.woundType || "other",
            description,
            initialSeverity: analysisResult.severityScore || 100,
            currentSeverity: analysisResult.severityScore || 100,
            initialImagePath: relativePath,
            latestImagePath: relativePath,
            lastUpdated: new Date(),
        });

        // Create analysis record
        const analysis = await Analysis.create({
            user: req.user._id,
            wound: wound._id,
            provider: "openai",
            model: model || "gpt-4o",
            imagePath: req.file.path,
            imageOriginalName: req.file.originalname,
            notes,
            ...analysisResult,
        });

        // Notify doctors who are tracking this patient
        const io = req.app.get("io");
        if (io && req.user.allowedDoctors?.length > 0) {
            io.to("doctors").emit("wound_created", {
                patientId: req.user._id,
                patientName: req.user.name,
                woundId: wound._id,
                severity: wound.currentSeverity,
            });
        }

        res.status(201).json({ wound, analysis });
    } catch (error) {
        console.error("[patient] create wound error:", error.message);
        res.status(500).json({ message: error.message || "Failed to create wound" });
    }
});

// Get all wounds for current patient
router.get("/wounds", authenticate, async (req, res) => {
    try {
        const wounds = await Wound.find({ patient: req.user._id })
            .sort({ currentSeverity: -1, updatedAt: -1 });
        res.json(wounds);
    } catch (error) {
        console.error("[patient] get wounds error:", error.message);
        res.status(500).json({ message: "Failed to fetch wounds" });
    }
});

// Delete a wound and its analyses
router.delete("/wounds/:id", authenticate, async (req, res) => {
    try {
        const wound = await Wound.findOne({
            _id: req.params.id,
            patient: req.user._id,
        });

        if (!wound) {
            return res.status(404).json({ message: "Wound not found" });
        }

        // Delete all associated analyses
        await Analysis.deleteMany({ wound: wound._id });

        // Delete the wound
        await Wound.deleteOne({ _id: wound._id });

        res.json({ message: "Wound deleted successfully" });
    } catch (error) {
        console.error("[patient] delete wound error:", error.message);
        res.status(500).json({ message: "Failed to delete wound" });
    }
});

// Get single wound details with all analyses
router.get("/wounds/:id", authenticate, async (req, res) => {
    try {
        const wound = await Wound.findOne({
            _id: req.params.id,
            patient: req.user._id,
        });

        if (!wound) {
            return res.status(404).json({ message: "Wound not found" });
        }

        const analyses = await Analysis.find({ wound: wound._id })
            .sort({ createdAt: -1 });

        res.json({ wound, analyses });
    } catch (error) {
        console.error("[patient] get wound error:", error.message);
        res.status(500).json({ message: "Failed to fetch wound" });
    }
});

// Update wound with new image
router.post("/wounds/:id/update", authenticate, upload.single("image"), async (req, res) => {
    try {
        const { notes = "", model = "gpt-4o" } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: "Wound image is required" });
        }

        const wound = await Wound.findOne({
            _id: req.params.id,
            patient: req.user._id,
        });

        if (!wound) {
            return res.status(404).json({ message: "Wound not found" });
        }

        // Prevent updates on healed wounds
        if (wound.status === "healed") {
            return res.status(400).json({ message: "Cannot update a healed wound" });
        }

        if (!wound) {
            return res.status(404).json({ message: "Wound not found" });
        }

        // Resolve previous image path if available
        let previousImagePath = null;
        if (wound.latestImagePath) {
            previousImagePath = path.join(path.dirname(uploadDir), wound.latestImagePath);
        }

        // Analyze the new wound image with comparison context
        const analysisResult = await analyzeWound({
            imagePath: req.file.path,
            notes,
            model,
            previousImagePath,
        });

        // Extract filename for relative path
        const filename = req.file.filename || req.file.path.split(/[/\\]/).pop();
        const relativePath = `uploads/${filename}`;

        // Update wound severity
        const previousSeverity = wound.currentSeverity;
        wound.currentSeverity = analysisResult.severityScore || wound.currentSeverity;
        wound.latestImagePath = relativePath;
        wound.lastUpdated = new Date();

        // Update status based on severity trend
        if (wound.currentSeverity < previousSeverity - 10) {
            wound.status = "healed"; // Improving
        } else if (wound.currentSeverity > previousSeverity + 10) {
            wound.status = "worsening";
        }

        await wound.save();

        // Create analysis record
        const analysis = await Analysis.create({
            user: req.user._id,
            wound: wound._id,
            provider: "openai",
            model: model || "gpt-4o",
            imagePath: relativePath,
            imageOriginalName: req.file.originalname,
            notes,
            ...analysisResult,
        });

        // Notify doctors who are tracking this patient
        const io = req.app.get("io");
        if (io && req.user.allowedDoctors?.length > 0) {
            io.to("doctors").emit("wound_updated", {
                patientId: req.user._id,
                patientName: req.user.name,
                woundId: wound._id,
                previousSeverity,
                currentSeverity: wound.currentSeverity,
                status: wound.status,
            });
        }

        res.json({ wound, analysis });
    } catch (error) {
        console.error("[patient] update wound error:", error.message);
        res.status(500).json({ message: error.message || "Failed to update wound" });
    }
});

// Get wound progress (severity over time)
router.get("/wounds/:id/progress", authenticate, async (req, res) => {
    try {
        const wound = await Wound.findOne({
            _id: req.params.id,
            patient: req.user._id,
        });

        if (!wound) {
            return res.status(404).json({ message: "Wound not found" });
        }

        const analyses = await Analysis.find({ wound: wound._id })
            .sort({ createdAt: 1 })
            .select("severityScore createdAt _id");

        const progress = analyses.map((a) => ({
            date: a.createdAt.toISOString(),
            severity: a.severityScore,
            analysisId: a._id.toString(),
        }));

        res.json({
            wound: {
                id: wound._id,
                name: wound.name,
                initialSeverity: wound.initialSeverity,
                currentSeverity: wound.currentSeverity,
                status: wound.status,
            },
            progress,
        });
    } catch (error) {
        console.error("[patient] wound progress error:", error.message);
        res.status(500).json({ message: "Failed to fetch progress" });
    }
});

// ==================== TRACK REQUEST ROUTES ====================

// Get pending track requests from doctors
router.get("/track-requests", authenticate, async (req, res) => {
    try {
        const requests = await TrackRequest.find({
            patient: req.user._id,
            status: "pending",
        }).populate("doctor", "name email avatar");

        res.json(requests);
    } catch (error) {
        console.error("[patient] get track requests error:", error.message);
        res.status(500).json({ message: "Failed to fetch track requests" });
    }
});

// Respond to track request (accept/reject)
router.post("/track-requests/:id/respond", authenticate, async (req, res) => {
    try {
        const { accept } = req.body;

        const request = await TrackRequest.findOne({
            _id: req.params.id,
            patient: req.user._id,
            status: "pending",
        });

        if (!request) {
            return res.status(404).json({ message: "Track request not found" });
        }

        request.status = accept ? "accepted" : "rejected";
        request.respondedAt = new Date();
        await request.save();

        if (accept) {
            // Add doctor to patient's allowedDoctors
            await User.findByIdAndUpdate(req.user._id, {
                $addToSet: { allowedDoctors: request.doctor },
            });

            // Add patient to doctor's trackedPatients
            await User.findByIdAndUpdate(request.doctor, {
                $addToSet: { trackedPatients: req.user._id },
            });
        }

        // Notify doctor about the response
        const io = req.app.get("io");
        if (io) {
            io.to("doctors").emit("track_request_response", {
                requestId: request._id,
                patientId: req.user._id,
                patientName: req.user.name,
                accepted: accept,
            });
        }

        res.json({ message: accept ? "Request accepted" : "Request rejected", request });
    } catch (error) {
        console.error("[patient] respond track request error:", error.message);
        res.status(500).json({ message: "Failed to respond to request" });
    }
});

// Get list of tracking doctors
router.get("/tracking-doctors", authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate("allowedDoctors", "name email avatar");
        res.json(user.allowedDoctors || []);
    } catch (error) {
        console.error("[patient] get tracking doctors error:", error.message);
        res.status(500).json({ message: "Failed to fetch doctors" });
    }
});

// Remove a doctor from tracking
router.delete("/tracking-doctors/:doctorId", authenticate, async (req, res) => {
    try {
        const { doctorId } = req.params;

        // Remove doctor from patient's allowedDoctors
        await User.findByIdAndUpdate(req.user._id, {
            $pull: { allowedDoctors: doctorId },
        });

        // Remove patient from doctor's trackedPatients
        await User.findByIdAndUpdate(doctorId, {
            $pull: { trackedPatients: req.user._id },
        });

        res.json({ message: "Doctor removed from tracking" });
    } catch (error) {
        console.error("[patient] remove tracking doctor error:", error.message);
        res.status(500).json({ message: "Failed to remove doctor" });
    }
});

// ==================== AI CONSULTATION ====================

router.post("/ai-consult", authenticate, async (req, res) => {
    try {
        const { message, woundId } = req.body;

        if (!message) {
            return res.status(400).json({ message: "Message is required" });
        }

        // Get wound context if provided
        let woundContext = "";
        if (woundId) {
            const wound = await Wound.findOne({ _id: woundId, patient: req.user._id });
            if (wound) {
                const latestAnalysis = await Analysis.findOne({ wound: woundId })
                    .sort({ createdAt: -1 });
                woundContext = `
Context about current wound:
- Name: ${wound.name}
- Body Part: ${wound.bodyPart || "Not specified"}
- Current Severity: ${wound.currentSeverity}/100
- Status: ${wound.status}
- Latest Analysis: ${latestAnalysis?.summary || "No analysis yet"}
`;
            }
        }

        // Use OpenAI for consultation
        const { OpenAI } = await import("openai");
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are a helpful medical AI assistant specializing in wound care. 
Provide helpful, accurate information about wound care and healing.
Always recommend consulting a real doctor for serious concerns.
Be empathetic and supportive in your responses.
${woundContext}`,
                },
                {
                    role: "user",
                    content: message,
                },
            ],
            max_tokens: 500,
        });

        res.json({
            response: response.choices[0]?.message?.content || "I apologize, I couldn't generate a response.",
        });
    } catch (error) {
        console.error("[patient] AI consult error:", error.message);
        res.status(500).json({ message: "Failed to get AI consultation" });
    }
});

export default router;
