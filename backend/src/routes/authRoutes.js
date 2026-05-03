import express from "express";
import jwt from "jsonwebtoken";
import passport from "../config/googleAuth.js";
import { User } from "../models/User.js";

const router = express.Router();

const buildToken = (userId) =>
  jwt.sign({ sub: userId }, process.env.JWT_SECRET || "dev_secret", {
    expiresIn: "12h",
  });

// Google OAuth routes (only if configured)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  router.get(
    "/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
    })
  );

  router.get(
    "/google/callback",
    (req, res, next) => {
      passport.authenticate("google", { session: false }, (err, user) => {
        if (err) {
          return res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=auth_failed`);
        }
        if (!user) {
          return res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=no_user`);
        }
        req.user = user;
        next();
      })(req, res, next);
    },
    (req, res) => {
      const token = buildToken(req.user._id);
      const userData = {
        _id: req.user._id,
        id: req.user._id.toString(),
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        roles: ["patient", "doctor"],
        avatar: req.user.avatar,
      };
      const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
      const redirectUrl = `${clientUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(userData))}`;
      console.log("[auth] Redirecting to:", redirectUrl);
      res.redirect(redirectUrl);
    }
  );
} else {
  router.get("/google", (_req, res) => {
    res.status(503).json({ message: "Google OAuth is not configured" });
  });
  router.get("/google/callback", (_req, res) => {
    res.status(503).json({ message: "Google OAuth is not configured" });
  });
}

// Register (email/password)
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      emailVerified: false,
    });

    const token = buildToken(user._id);
    res.status(201).json({
      token,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        roles: ["patient", "doctor"],
      },
    });
  } catch (error) {
    console.error("[auth] register error:", error.message);
    res.status(500).json({ message: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    // 1. Get user with password (normalize email to lowercase)
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

    // 2. SAFETY CHECK: If user exists but has NO password (e.g. Google Auth user), fail gracefully
    if (!user || !user.password) {
      // Return 401 instead of crashing with 500
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 3. Compare
    if (!(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = buildToken(user._id);
    const userResponse = {
      _id: user._id,
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      // Force dual roles for testing/demo purposes as requested
      roles: ["patient", "doctor"],
      avatar: user.avatar,
    };

    res.json({
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error("[auth] login error:", error.message);
    res.status(500).json({ message: "Login failed" });
  }
});

export default router;

