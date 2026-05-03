import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../src/models/User.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend/.env
dotenv.config({ path: path.join(__dirname, "../.env") });

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        const users = await User.find({}).select("name email role roles");
        console.log("Users found:", users.length);

        users.forEach(u => {
            console.log(`- ${u.name} (${u.email}): role=${u.role}, roles=${JSON.stringify(u.roles)}`);
        });

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
    }
};

run();
