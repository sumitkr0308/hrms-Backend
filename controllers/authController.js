const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { SuperAdmin, Client, HR } = require("../models");
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;

const login = (Model, role) => async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await Model.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

   
    const accessToken = jwt.sign({ id: user._id, role:user.role }, ACCESS_TOKEN_SECRET, { expiresIn: "8h" });
      res.json({
      accessToken,
      user: { id: user._id, name: user.name, email: user.email, role:user.role },
    });
  } catch (err) {
    console.error(`Login error for role [${role}]:`, err.message);
    res.status(500).json({ message: "Server error during login" });
  }
};

module.exports = {
  loginSuperAdmin: login(SuperAdmin, "superadmin"),
  loginHR: login(HR, "hr"),
  loginClient: login(Client, "client"),
};