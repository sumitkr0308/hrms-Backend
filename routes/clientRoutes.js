const express = require("express");
const router = express.Router();
const clientController = require("../controllers/clientController");
const { authClient } = require("../middleware/authMiddleware");

// Protect all routes in this file
router.use(authClient);

// Job Routes
router.get("/jobs", clientController.getJobs);

// Candidate Routes
router.get("/jobs/:jobId/candidates", clientController.getCandidatesForJob);
router.patch("/candidates/:candidateId/status", clientController.updateCandidateStatus);
router.put("/candidates/:candidateId/remarks", clientController.updateCandidateRemarks);

module.exports = router;