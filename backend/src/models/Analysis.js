import mongoose from "mongoose";

const InsightSchema = new mongoose.Schema(
  {
    label: String,
    detail: String,
  },
  { _id: false }
);

const AnalysisSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    provider: {
      type: String,
      enum: ["openai"],
      default: "openai",
      required: true,
    },
    model: {
      type: String,
      enum: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
      default: "gpt-4o",
      required: true,
    },
    imagePath: {
      type: String,
      required: true,
    },
    imageOriginalName: String,
    notes: String,
    summary: String,
    severityScore: Number,
    recommendations: [String],
    insights: [InsightSchema],
    wound: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wound",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

export const Analysis =
  mongoose.models.Analysis || mongoose.model("Analysis", AnalysisSchema);

