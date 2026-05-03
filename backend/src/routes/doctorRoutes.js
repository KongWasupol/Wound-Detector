import express from "express";
import { authenticate } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { Wound } from "../models/Wound.js";
import { Analysis } from "../models/Analysis.js";
import { TrackRequest } from "../models/TrackRequest.js";

const router = express.Router();

// ==================== PATIENT TRACKING ====================

// Get list of tracked patients (sorted by highest severity)
router.get("/patients", authenticate, async (req, res) => {
    try {
        const doctor = await User.findById(req.user._id).populate(
            "trackedPatients",
            "name email avatar lastLoginAt"
        );

        if (!doctor.trackedPatients || doctor.trackedPatients.length === 0) {
            return res.json([]);
        }

        // Get patient severity info
        const patientsWithStatus = await Promise.all(
            doctor.trackedPatients.map(async (patient) => {
                // Get highest severity wound
                const highestSeverityWound = await Wound.findOne({
                    patient: patient._id,
                    status: { $ne: "healed" },
                })
                    .sort({ currentSeverity: -1 })
                    .select("currentSeverity name status lastUpdated");

                // Get all active wounds count
                const activeWoundsCount = await Wound.countDocuments({
                    patient: patient._id,
                    status: { $ne: "healed" },
                });

                return {
                    ...patient.toObject(),
                    highestSeverity: highestSeverityWound?.currentSeverity || 0,
                    highestSeverityWound: highestSeverityWound || null,
                    activeWoundsCount,
                };
            })
        );

        // Sort by highest severity (descending)
        patientsWithStatus.sort((a, b) => b.highestSeverity - a.highestSeverity);

        res.json(patientsWithStatus);
    } catch (error) {
        console.error("[doctor] get patients error:", error.message);
        res.status(500).json({ message: "Failed to fetch patients" });
    }
});

// Search for patients
router.get("/search", authenticate, async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.json([]);
        }

        // Search for all users (everyone is dual-mode now)
        // Exclude current doctor from search results (cannot track themselves)
        const patients = await User.find({
            _id: { $ne: req.user._id }, // Exclude self
            $or: [
                { name: { $regex: q, $options: "i" } },
                { email: { $regex: q, $options: "i" } },
            ]
        })
            .select("name email avatar")
            .limit(20);

        // Check existing tracking status
        const patientsWithStatus = await Promise.all(
            patients.map(async (patient) => {
                const existingRequest = await TrackRequest.findOne({
                    doctor: req.user._id,
                    patient: patient._id,
                }).sort({ createdAt: -1 });

                const isTracking = req.user.trackedPatients?.includes(patient._id);

                return {
                    ...patient.toObject(),
                    trackingStatus: isTracking
                        ? "tracking"
                        : existingRequest?.status || "none",
                };
            })
        );

        res.json(patientsWithStatus);
    } catch (error) {
        console.error("[doctor] search patients error:", error.message);
        res.status(500).json({ message: "Failed to search patients" });
    }
});

// Request to track a patient
router.post("/request-track", authenticate, async (req, res) => {
    try {
        const { patientId, message } = req.body;

        if (!patientId) {
            return res.status(400).json({ message: "Patient ID is required" });
        }

        // Since everyone is dual-mode, just check if user exists (not role)
        const patient = await User.findById(patientId);
        if (!patient) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if doctor is trying to track themselves
        if (patientId === req.user._id.toString()) {
            return res.status(400).json({ message: "Cannot track yourself" });
        }

        // Check if already tracking
        if (req.user.trackedPatients?.includes(patientId)) {
            return res.status(400).json({ message: "Already tracking this patient" });
        }

        // Check for existing pending request
        const existingRequest = await TrackRequest.findOne({
            doctor: req.user._id,
            patient: patientId,
            status: "pending",
        });

        if (existingRequest) {
            return res.status(400).json({ message: "Pending request already exists" });
        }

        const trackRequest = await TrackRequest.create({
            doctor: req.user._id,
            patient: patientId,
            message: message || `Dr. ${req.user.name} requests to track your wound progress.`,
        });

        // Notify patient via socket
        const io = req.app.get("io");
        if (io) {
            io.to(`patient_${patientId}`).emit("track_request", {
                requestId: trackRequest._id,
                doctorName: req.user.name,
                doctorEmail: req.user.email,
                message: trackRequest.message,
            });
        }

        res.status(201).json(trackRequest);
    } catch (error) {
        console.error("[doctor] request track error:", error.message);
        res.status(500).json({ message: "Failed to send track request" });
    }
});

// Get pending track requests sent by this doctor
router.get("/track-requests", authenticate, async (req, res) => {
    try {
        const requests = await TrackRequest.find({
            doctor: req.user._id,
        })
            .populate("patient", "name email avatar")
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (error) {
        console.error("[doctor] get track requests error:", error.message);
        res.status(500).json({ message: "Failed to fetch track requests" });
    }
});

// Cancel a pending track request
router.delete("/track-requests/:requestId", authenticate, async (req, res) => {
    try {
        const { requestId } = req.params;

        const request = await TrackRequest.findOne({
            _id: requestId,
            doctor: req.user._id,
            status: "pending",
        });

        if (!request) {
            return res.status(404).json({ message: "Track request not found or already processed" });
        }

        await TrackRequest.findByIdAndDelete(requestId);

        res.json({ message: "Track request cancelled" });
    } catch (error) {
        console.error("[doctor] cancel track request error:", error.message);
        res.status(500).json({ message: "Failed to cancel track request" });
    }
});

// ==================== PATIENT WOUND DATA ====================


// Get all wounds of a specific patient
router.get("/patients/:patientId/wounds", authenticate, async (req, res) => {
    try {
        const { patientId } = req.params;

        // Verify doctor has access to this patient
        if (!req.user.trackedPatients?.includes(patientId)) {
            return res.status(403).json({ message: "You do not have access to this patient" });
        }

        const wounds = await Wound.find({ patient: patientId })
            .sort({ currentSeverity: -1, updatedAt: -1 });

        res.json(wounds);
    } catch (error) {
        console.error("[doctor] get patient wounds error:", error.message);
        res.status(500).json({ message: "Failed to fetch wounds" });
    }
});

// Get wound details and progress
router.get("/patients/:patientId/wounds/:woundId", authenticate, async (req, res) => {
    try {
        const { patientId, woundId } = req.params;

        // Verify doctor has access to this patient
        if (!req.user.trackedPatients?.includes(patientId)) {
            return res.status(403).json({ message: "You do not have access to this patient" });
        }

        const wound = await Wound.findOne({
            _id: woundId,
            patient: patientId,
        });

        if (!wound) {
            return res.status(404).json({ message: "Wound not found" });
        }

        const analyses = await Analysis.find({ wound: woundId })
            .sort({ createdAt: -1 });

        res.json({ wound, analyses });
    } catch (error) {
        console.error("[doctor] get wound details error:", error.message);
        res.status(500).json({ message: "Failed to fetch wound details" });
    }
});

// Get wound progress graph data
router.get("/patients/:patientId/wounds/:woundId/progress", authenticate, async (req, res) => {
    try {
        const { patientId, woundId } = req.params;

        // Verify doctor has access to this patient
        if (!req.user.trackedPatients?.includes(patientId)) {
            return res.status(403).json({ message: "You do not have access to this patient" });
        }

        const wound = await Wound.findOne({
            _id: woundId,
            patient: patientId,
        });

        if (!wound) {
            return res.status(404).json({ message: "Wound not found" });
        }

        const analyses = await Analysis.find({ wound: woundId })
            .sort({ createdAt: 1 })
            .select("severityScore createdAt _id summary");

        const progress = analyses.map((a) => ({
            date: a.createdAt.toISOString(),
            severity: a.severityScore,
            analysisId: a._id.toString(),
            summary: a.summary,
        }));

        res.json({
            wound: {
                id: wound._id,
                name: wound.name,
                bodyPart: wound.bodyPart,
                initialSeverity: wound.initialSeverity,
                currentSeverity: wound.currentSeverity,
                status: wound.status,
            },
            progress,
        });
    } catch (error) {
        console.error("[doctor] wound progress error:", error.message);
        res.status(500).json({ message: "Failed to fetch progress" });
    }
});

// Get patient summary report
router.get("/patients/:patientId/summary", authenticate, async (req, res) => {
    try {
        const { patientId } = req.params;

        // Verify doctor has access
        if (!req.user.trackedPatients?.includes(patientId)) {
            return res.status(403).json({ message: "You do not have access to this patient" });
        }

        const patient = await User.findById(patientId).select("name email avatar");

        const wounds = await Wound.find({ patient: patientId });
        const totalWounds = wounds.length;
        const activeWounds = wounds.filter(w => w.status !== "healed").length;
        const healedWounds = wounds.filter(w => w.status === "healed").length;
        const worseningWounds = wounds.filter(w => w.status === "worsening").length;

        const avgSeverity = activeWounds > 0
            ? wounds.filter(w => w.status !== "healed").reduce((sum, w) => sum + w.currentSeverity, 0) / activeWounds
            : 0;

        // Get latest analysis for summary
        const latestAnalysis = await Analysis.findOne({ user: patientId })
            .sort({ createdAt: -1 })
            .select("summary recommendations createdAt");

        res.json({
            patient,
            stats: {
                totalWounds,
                activeWounds,
                healedWounds,
                worseningWounds,
                avgSeverity: Math.round(avgSeverity),
            },
            latestAnalysis,
            wounds: wounds.map(w => ({
                id: w._id,
                name: w.name,
                currentSeverity: w.currentSeverity,
                status: w.status,
                lastUpdated: w.lastUpdated,
            })),
        });
    } catch (error) {
        console.error("[doctor] patient summary error:", error.message);
        res.status(500).json({ message: "Failed to fetch patient summary" });
    }
});

// Remove patient from tracking
router.delete("/patients/:patientId", authenticate, async (req, res) => {
    try {
        const { patientId } = req.params;

        // Remove from doctor's trackedPatients
        await User.findByIdAndUpdate(req.user._id, {
            $pull: { trackedPatients: patientId },
        });

        // Remove from patient's allowedDoctors
        await User.findByIdAndUpdate(patientId, {
            $pull: { allowedDoctors: req.user._id },
        });

        res.json({ message: "Patient removed from tracking" });
    } catch (error) {
        console.error("[doctor] remove patient error:", error.message);
        res.status(500).json({ message: "Failed to remove patient" });
    }
});

export default router;
