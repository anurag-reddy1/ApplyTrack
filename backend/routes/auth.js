import { Router } from "express";
import { getDB } from "../config/db.js";

const router = Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const db = getDB();
    const users = db.collection("users");

    const existingUser = await users.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ error: "An account with this email already exists." });
    }

    const newUser = {
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password,
      createdAt: new Date(),
    };

    const result = await users.insertOne(newUser);

    return res.status(201).json({
      message: "Account created successfully.",
      userId: result.insertedId,
      username: newUser.username,
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }

    const db = getDB();
    const users = db.collection("users");

    const user = await users.findOne({
      email: email.trim().toLowerCase(),
      password,
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    return res.status(200).json({
      message: "Login successful.",
      userId: user._id,
      username: user.username,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
