const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const dns = require("dns");
require("dotenv").config();

// Ensure Node's DNS resolver can query SRV records for MongoDB Atlas on local Windows machines.
// In serverless (Vercel/AWS Lambda), overriding DNS to 8.8.8.8 breaks internal cloud DNS routing.
if (process.platform === "win32" && !process.env.VERCEL) {
    try {
        dns.setServers(["8.8.8.8", "8.8.4.4"]);
    } catch (e) {
        // fallback if not allowed
    }
}

const app = express();
app.use(express.json());
app.use(cors());

// Serverless-friendly Mongoose connection cache across function invocations
let cached = global.mongoose;
if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
    if (cached.conn && mongoose.connection.readyState === 1) {
        return cached.conn;
    }

    if (!cached.promise || mongoose.connection.readyState === 0) {
        const opts = {
            serverSelectionTimeoutMS: 5000,
            maxPoolSize: 10
        };
        cached.promise = mongoose.connect(process.env.MONGODB_URI, opts).then((m) => {
            return m;
        }).catch((err) => {
            cached.promise = null;
            throw err;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

// Health check endpoint (always accessible to verify deployment and DB connectivity)
app.get("/api/health", async (req, res) => {
    const states = ["disconnected", "connected", "connecting", "disconnecting"];
    let dbStatus = states[mongoose.connection.readyState] || "unknown";
    let dbError = null;
    try {
        if (process.env.MONGODB_URI) {
            await connectDB();
            dbStatus = states[mongoose.connection.readyState] || "unknown";
        } else {
            dbError = "Missing MONGODB_URI in environment variables";
        }
    } catch (e) {
        dbError = e.message;
    }
    res.json({
        status: "ok",
        app: "FoodBridge API",
        database: dbStatus,
        dbError: dbError,
        isVercel: !!process.env.VERCEL
    });
});

// Middleware for all other API routes: ensures database is fully connected before executing queries
app.use("/api", async (req, res, next) => {
    const missingConfig = ["MONGODB_URI", "JWT_SECRET"].filter((key) => !process.env[key]);
    if (missingConfig.length) {
        return res.status(500).json({ error: `Server configuration is missing ${missingConfig.join(" and ")}` });
    }
    try {
        await connectDB();
        next();
    } catch (err) {
        console.error("MongoDB connection error:", err.message);
        res.status(503).json({
            error: `Database connection failed: ${err.message}. Please check MongoDB Atlas Network Access (whitelist 0.0.0.0/0) and Vercel MONGODB_URI.`
        });
    }
});

// ---------- API ROUTES ----------
app.use("/api/auth", require("./routes/auth"));
app.use("/api/ngos", require("./routes/ngos"));
app.use("/api/donations", require("./routes/donations"));
app.use("/api/stats", require("./routes/stats"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/admin", require("./routes/admin"));

// ---------- FRONTEND (served by the same server) ----------
app.use(express.static(path.join(__dirname, "frontend")));

// ---------- ERROR HANDLER ----------
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        return res.status(400).json({ error: "Invalid JSON payload provided" });
    }
    console.error("Server error:", err.message || err);
    res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

module.exports = app;

// ---------- START ----------
if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
        console.log("Missing MONGODB_URI or JWT_SECRET. Create your .env file (copy .env.example).");
        process.exit(1);
    }
    connectDB()
        .then(() => {
            console.log("MongoDB connected");
            app.listen(PORT, () => console.log(`FoodBridge running at http://localhost:${PORT}`));
        })
        .catch((err) => {
            console.log("MongoDB connection error:", err.message);
            process.exit(1);
        });
}