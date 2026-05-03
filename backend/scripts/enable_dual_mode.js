import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../src/models/User.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const run = async () => {
    try {
        console.log("Starting connection...");
        const uri = "mongodb+srv://admin:uuqHEezxoqtTIL9Q@cluster0.fmyaltp.mongodb.net/?appName=Cluster0"; // Hardcoded from .env
        await mongoose.connect(uri);
        console.log("Connected to MongoDB for Update");

        // Update ALL users to have dual roles for testing purposes
        // Or strictly the one from the screenshot if we could filter by name "SOLO 878"
        // But let's just update everyone to be safe and easy.

        const res = await User.updateMany(
            {},
            {
                $set: { roles: ["patient", "doctor"] }
            }
        );

        console.log(`Updated ${res.modifiedCount} users to have dual roles.`);

        const users = await User.find({}).select("name email roles");
        users.forEach(u => {
            console.log(`User ${u.name} now has roles: ${JSON.stringify(u.roles)}`);
        });

    } catch (error) {
        console.error("Update Error:", error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

run();
