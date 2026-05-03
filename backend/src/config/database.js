import mongoose from "mongoose";

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("[database] Missing MONGODB_URI. Skipping Mongo connection.");
    return;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("[database] Connected to MongoDB Atlas");
  } catch (error) {
    console.error("[database] MongoDB connection error:", error.message);
    throw error;
  }
};

