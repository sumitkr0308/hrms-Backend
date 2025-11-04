const { JobPosting, Candidate } = require("../models");
const mongoose = require("mongoose");

exports.getJobs = async (req, res) => {
    try {
        const clientId = new mongoose.Types.ObjectId(req.user._id);
        const jobsWithCount = await JobPosting.aggregate([
            { $match: { clientId: clientId } },
            {
                $lookup: {
                    from: "hrs",
                    localField: "assignedHr",
                    foreignField: "_id",
                    as: "assignedHrDetails"
                }
            },
            {
                $unwind: {
                    path: "$assignedHrDetails",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "candidates",
                    localField: "_id",
                    foreignField: "jobId",
                    as: "candidates"
                }
            },
            {
                $addFields: {
                    candidateCount: { $size: "$candidates" }
                }
            },
            {
                $project: {
                    candidates: 0,
                    "assignedHrDetails.password": 0,
                    "assignedHrDetails.assignedClientIds": 0,
                }
            }
        ]);
        res.json(jobsWithCount);
    } catch (err) {
        console.error("Client fetch jobs error:", err.message);
        res.status(500).json({ message: "Failed to fetch jobs" });
    }
};

exports.getCandidatesForJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const job = await JobPosting.findById(jobId);
        if (!job || job.clientId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Forbidden: Job not found or access denied" });
        }
        const candidates = await Candidate.find({ jobId: job._id });
        res.json(candidates);
    } catch (err) {
        console.error("Client fetch candidates error:", err.message);
        res.status(500).json({ message: "Failed to fetch candidates" });
    }
};

exports.updateCandidateStatus = async (req, res) => {
    try {
        const { candidateId } = req.params;
        const { status } = req.body;
        const candidate = await Candidate.findById(candidateId);
        if (!candidate) return res.status(404).json({ message: "Candidate not found." });

        const job = await JobPosting.findById(candidate.jobId);
        if (!job || job.clientId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Forbidden: You do not have access to this candidate." });
        }

        candidate.status = status;
        await candidate.save();
        res.json(candidate);
    } catch (err) {
        console.error("Client update status error:", err.message);
        res.status(500).json({ message: "Failed to update status." });
    }
};

exports.updateCandidateRemarks = async (req, res) => {
    try {
        const { candidateId } = req.params;
        const { remarks } = req.body;
        const candidate = await Candidate.findById(candidateId);
        if (!candidate) return res.status(404).json({ message: "Candidate not found." });

        const job = await JobPosting.findById(candidate.jobId);
        if (!job || job.clientId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Forbidden." });
        }

        candidate.remarks = remarks;
        await candidate.save();
        res.json(candidate);
    } catch (err) {
        console.error("Client update remark error:", err.message);
        res.status(500).json({ message: "Failed to update remark." });
    }
};