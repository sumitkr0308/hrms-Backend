const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();
const { SuperAdmin } = require("./models"); // Only needed for initial seeding
const bcrypt = require("bcryptjs"); // Only needed for initial seeding


// --- Import Routes ---
const authRoutes = require("./routes/authRoutes");
const superAdminRoutes = require("./routes/superAdminRoutes");
const hrRoutes = require("./routes/hrRoutes");
const clientRoutes = require("./routes/clientRoutes");
const candidateRoutes = require("./routes/candidateRoutes");

// --- Initialize App ---
const app = express();
const PORT = process.env.PORT || 4000;

// ----------------------
// Middleware
// ----------------------
app.use(
  cors({
    origin: [
      "https://mutantwork.vercel.app", //  frontend domain
      "http://localhost:5173"                  // for local testing
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ----------------------
// MongoDB Connection & Seeding
// ----------------------
(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Seed initial SuperAdmin if none exists
    if ((await SuperAdmin.countDocuments()) === 0) {
      const hashedPass = await bcrypt.hash("superadmin123", 10);
      await new SuperAdmin({ email: "super@admin.com", password: hashedPass }).save();
      console.log("✅ Default SuperAdmin created (super@admin.com / superadmin123)");
    }
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
})();


// ----------------------
// API Routes
// ----------------------
app.use("/api", authRoutes); // For all login routes
app.use("/api/superadmin", superAdminRoutes);
app.use("/api/hr", hrRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/candidate", candidateRoutes); // For public candidate routes like resume parsing

// ----------------------
// Global Error Handling & 404
// ----------------------
app.use((req, res) => res.status(404).json({ message: `Not Found - ${req.method} ${req.originalUrl}` }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "An unexpected error occurred", error: err.message });
});

// ----------------------
// Start Server
// ----------------------
// app.listen(PORT, () => console.log(`🚀 HRMS server running at http://localhost:${PORT}`));

module.exports = app;