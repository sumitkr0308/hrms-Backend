const jwt = require("jsonwebtoken");
const { SuperAdmin, Client, HR } = require("../models");
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;

// --- HR Auth Middleware (allows Recruiter or Manager) ---
const authHR = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET);

    // Only HR roles allowed
    if (!["Recruiter", "Manager"].includes(payload.role)) {
      return res.status(403).json({ message: "Forbidden: Not an HR" });
    }

    const user = await HR.findById(payload.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    req.user = user; // attach HR user object
    next();
  } catch (err) {
    console.error("HR Auth error:", err.message);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

// --- Middleware to check Manager role specifically ---
const isManager = (req, res, next) => {
  if (req.user.role === "Manager") next();
  else res.status(403).json({ message: "Forbidden: Manager role required." });
};

// --- SuperAdmin Middleware ---
const authSuperAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET);

    if (payload.role !== "superadmin") {
      return res.status(403).json({ message: "Forbidden: SuperAdmin role required." });
    }

    const user = await SuperAdmin.findById(payload.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("SuperAdmin Auth error:", err.message);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

// --- Client Middleware ---
const authClient = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET);

    if (payload.role !== "client") {
      return res.status(403).json({ message: "Forbidden: Client role required." });
    }

    const user = await Client.findById(payload.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Client Auth error:", err.message);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

module.exports = {
  authHR,
  isManager,
  authSuperAdmin,
  authClient,
};
