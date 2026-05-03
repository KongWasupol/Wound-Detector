import "dotenv/config";
import { connectDB } from "../src/config/database.js";
import { User } from "../src/models/User.js";
import mongoose from "mongoose";

dotenv.config();

const verifyUsers = async () => {
    try {
        await connectDB();
        const count = await User.countDocuments({});
        console.log(`Total Users in DB: ${count}`);
        const users = await User.find({}, 'email role');
        console.log("Users found:");
        users.forEach(u => console.log(`- ${u.email} (${u.role})`));

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

verifyUsers();
