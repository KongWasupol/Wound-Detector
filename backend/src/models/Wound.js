import mongoose from "mongoose";

const WoundSchema = new mongoose.Schema(
    {
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        name: {
            type: String,
            default: "Wound 1",
        },
        bodyPart: {
            type: String,
            trim: true,
        },
        woundType: {
            type: String,
            enum: ["cut", "burn", "scratch", "bruise", "other"],
            default: "other",
        },
        description: {
            type: String,
            trim: true,
        },
        initialSeverity: {
            type: Number,
            default: 100,
            min: 0,
            max: 100,
        },
        currentSeverity: {
            type: Number,
            default: 100,
            min: 0,
            max: 100,
        },
        status: {
            type: String,
            enum: ["active", "healed", "worsening"],
            default: "active",
        },
        lastUpdated: {
            type: Date,
            default: Date.now,
        },
        reminderEnabled: {
            type: Boolean,
            default: true,
        },
        // Store the first image for reference
        initialImagePath: String,
        // Store the latest image
        latestImagePath: String,
    },
    { timestamps: true }
);

// Index for efficient queries
WoundSchema.index({ patient: 1, status: 1 });
WoundSchema.index({ currentSeverity: -1 });

export const Wound = mongoose.models.Wound || mongoose.model("Wound", WoundSchema);
