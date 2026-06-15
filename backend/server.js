import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB, closeDB } from "./config/db.js";
import authRouter from "./routes/auth.js";
import applicationsRouter from "./routes/applications.js";
import interviewsRouter from "./routes/interviews.js";
import networkingRouter from "./routes/networking.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, same-origin)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: origin "${origin}" not allowed.`));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Frontend Static Files
// The frontend folder lives one level up from backend/
const frontendPath = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendPath));

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/applications", applicationsRouter);
app.use("/api/interviews", interviewsRouter);
app.use("/api/networking", networkingRouter);

// Health Check
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// SPA Fallback — serve index.html for all non-API routess
app.get("/{*path}", (req, res) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(frontendPath, "index.html"));
  }
});

// Start Server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 ApplyTrack server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
};

// Shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down server...");
  await closeDB();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeDB();
  process.exit(0);
});

startServer();
