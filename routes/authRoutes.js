const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/superadmin/login", authController.loginSuperAdmin);
router.post("/hr/login", authController.loginHR);
router.post("/client/login", authController.loginClient);

module.exports = router;