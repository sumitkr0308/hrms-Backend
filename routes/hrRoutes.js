const express = require("express");
const router = express.Router();
const hrController = require("../controllers/hrController");
const { authHR,isManager } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");



// Apply general HR authentication to ALL routes in this file
router.use(authHR);

// --- General Routes (accessible by both roles) ---
router.get("/assigned-clients", hrController.getAssignedClients); // For Recruiters
router.get("/clients/:clientId/jobs", hrController.getJobsByClient);
router.post("/candidates", upload.single("resume"), hrController.createCandidate);
router.get("/jobs/:jobId/candidates", hrController.getCandidatesByJob);
router.get("/jobs/:jobId/search", hrController.searchCandidatesInJob);
router.put("/candidates/:candidateId", hrController.updateCandidate);
router.patch("/candidates/:candidateId/status", hrController.updateCandidateStatus);

// --- Manager-Only Routes ---
router.get("/all-clients", isManager, hrController.getAllClients);
router.get("/all-recruiters", isManager, hrController.getAllRecruiters);
router.post("/assign-recruiter", isManager, hrController.assignClientToRecruiter);
router.post("/jobs", isManager, hrController.createJob);
router.get("/jobs", isManager, hrController.getAllJobs);
router.put("/jobs/:jobId", isManager, hrController.updateJob);
router.delete("/jobs/:jobId", isManager, hrController.deleteJob);
router.get("/all-candidates",  hrController.getAllCandidates);
router.get("/search-candidates",  hrController.searchAllCandidates);

module.exports = router;