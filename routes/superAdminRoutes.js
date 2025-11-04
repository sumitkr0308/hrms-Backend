const express = require("express");
const router = express.Router();
const superAdminController = require("../controllers/superAdminController");
const { authSuperAdmin } = require("../middleware/authMiddleware");

// Protect all routes in this file
router.use(authSuperAdmin);

router.get("/data", superAdminController.getDashboardData);
router.post("/hrs", superAdminController.createHr);
router.post("/clients", superAdminController.createClient);
router.post("/assign", superAdminController.assignClientToHr);
router.put("/:type/:id", superAdminController.updateUser);
router.delete("/:type/:id", superAdminController.deleteUser);

module.exports = router;