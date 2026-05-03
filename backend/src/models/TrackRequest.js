import mongoose from "mongoose";

const TrackRequestSchema = new mongoose.Schema(
    {
        doctor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ["pending", "accepted", "rejected"],
            default: "pending",
        },
        message: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        respondedAt: Date,
    },
    { timestamps: true }
);

// Ensure unique pending request per doctor-patient pair
TrackRequestSchema.index(
    { doctor: 1, patient: 1 },
    { unique: true, partialFilterExpression: { status: "pending" } }
);

export const TrackRequest =
    mongoose.models.TrackRequest || mongoose.model("TrackRequest", TrackRequestSchema);
