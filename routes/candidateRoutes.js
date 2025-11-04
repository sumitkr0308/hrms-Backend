const express = require("express");
const router = express.Router();
const candidateController = require("../controllers/candidateController");
const upload = require("../middleware/uploadMiddleware");
// Note: This route is kept separate because it might be used by different roles (e.g., HR, Candidate)
// For now, we assume it's a public/semi-public utility.
// If it needs protection, add the appropriate auth middleware.

router.post("/upload-resume", upload.single("resume"), candidateController.parseResume);

module.exports = router;