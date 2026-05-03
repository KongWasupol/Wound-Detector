import "dotenv/config"; // Load env vars immediately
import { connectDB } from "../src/config/database.js";
import { User } from "../src/models/User.js";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import path from "path";

console.log("DEBUG: Current Dir:", process.cwd());
console.log("DEBUG: MONGODB_URI:", process.env.MONGODB_URI ? "Found" : "Missing");
if (!process.env.MONGODB_URI) {
    // Try explicit path if missing
    import("dotenv").then(d => {
        d.default.config({ path: path.resolve(process.cwd(), "../.env") });
        console.log("DEBUG: Retry MONGODB_URI:", process.env.MONGODB_URI ? "Found" : "Missing");
    });
}

const seedUsers = async () => {
    try {
        console.log("🌱 Starting user seeding...");

        await connectDB();

        const users = [];
        const password = "password123";

        // Create 8 Patients
        for (let i = 1; i <= 8; i++) {
            users.push({
                name: `Test Patient ${i}`,
                email: `patient${i}@test.com`,
                password,
                role: "patient",
                roles: ["patient"],
                emailVerified: true,
            });
        }

        // Create 2 Doctors
        for (let i = 1; i <= 2; i++) {
            users.push({
                name: `Test Doctor ${i}`,
                email: `doctor${i}@test.com`,
                password,
                role: "doctor",
                roles: ["doctor"],
                emailVerified: true,
            });
        }

        console.log("📝 Creating 10 test users...");

        for (const user of users) {
            // Check if user exists
            const exists = await User.findOne({ email: user.email });
            if (exists) {
                console.log(`⚠️  User ${user.email} already exists. Skipping.`);
                continue;
            }

            // Create user
            await User.create(user);
            console.log(`✅ Created ${user.role}: ${user.email}`);
        }

        console.log("\n🎉 User seeding completed successfully!");
        console.log(`🔑 All accounts have password: ${password}`);

        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error("❌ Error seeding users:", error);
        await mongoose.connection.close();
        process.exit(1);
    }
};

seedUsers();
