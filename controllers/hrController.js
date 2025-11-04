const { HR, Client, JobPosting, Candidate, } = require("../models");
const fs = require("fs");
const pdf = require("pdf-parse");

// Fetches ALL clients (for Managers)
exports.getAllClients = async (req, res) => {
    try {
        const clients = await Client.find().select("name email");
        res.json(clients);
    } catch (err) {
        console.error("Error fetching all clients:", err.message);
        res.status(500).json({ message: "Failed to fetch all clients" });
    }
};

// Fetches ALL HR members (for Managers)
exports.getAllHrs = async (req, res) => {
    try {
        const hrTeam = await HR.find().select("-password");
        res.json(hrTeam);
    } catch (err) {
        console.error("Error fetching all HRs:", err.message);
        res.status(500).json({ message: "Failed to fetch all HRs" });
    }
};

// Fetches ALL HRs with the 'Recruiter' role (for Managers to assign jobs)
exports.getAllRecruiters = async (req, res) => {
    try {
        const recruiters = await HR.find({ role: 'Recruiter' }).select("name email");
        res.json(recruiters);
    } catch (err) {
        console.error("Error fetching recruiters:", err.message);
        res.status(500).json({ message: "Failed to fetch recruiters" });
    }
};

// Fetches only the user's assigned clients (for Recruiters)
exports.getAssignedClients = async (req, res) => {
    try {
        const clientIds = req.user.assignedClientIds || [];
        const clients = await Client.find({ '_id': { $in: clientIds } }).select("name email");
        res.json(clients);
    } catch (err) {
        console.error("Error fetching assigned clients:", err.message);
        res.status(500).json({ message: "Failed to fetch assigned clients" });
    }
};

// Fetches jobs for a specific client, with role-based security
exports.getJobsByClient = async (req, res) => {
    try {
        const { clientId } = req.params;
        // Manager has universal access
        if (req.user.role !== 'Manager') {
            // Recruiter must be assigned to the client
            if (!req.user.assignedClientIds.map(id => id.toString()).includes(clientId)) {
                return res.status(403).json({ message: "Forbidden: You are not assigned to this client." });
            }
        }
        
        const jobs = await JobPosting.find({ clientId: clientId, status: "Open" }, 'title location');
        res.json(jobs || []);
    } catch (err) {
        console.error("Error fetching jobs for client:", err.message);
        res.status(500).json({ message: "Failed to fetch jobs for client" });
    }
};

// Fetches all jobs (for Managers) or assigned jobs (for Recruiters)
exports.getAllJobs = async (req, res) => {
    try {
        let jobsQuery;
        if (req.user.role === 'Manager') {
            // Manager gets all jobs
            jobsQuery = JobPosting.find({});
        } else {
            // Recruiter gets only jobs for their assigned clients
            const clientIds = req.user.assignedClientIds || [];
            jobsQuery = JobPosting.find({ clientId: { $in: clientIds } });
        }

        // Now, chain the populate methods to the query
        const jobs = await jobsQuery
            .populate('assignedHr', 'name email')
            .populate('clientId', 'name') // <-- THIS IS THE FIX
            .sort({ createdAt: -1 });

        res.json(jobs);
    } catch (err) {
        console.error("HR fetch all jobs error:", err.message);
        res.status(500).json({ message: "Failed to fetch jobs" });
    }
};

// Creates a new job posting (Manager only, security check is in the route)
exports.createJob = async (req, res) => {
    try {
        const {
            clientId, title, department, location, employmentType, experienceLevel,
            salaryMin, salaryMax, deadline, description, assignedHr,
        } = req.body;

        if (!clientId || !title || !department || !assignedHr || !experienceLevel) {
            return res.status(400).json({ message: "Missing required fields." });
        }

        const newJob = new JobPosting({
            clientId, title, department, location, employmentType, experienceLevel,
            description, deadline: deadline || null, assignedHr,
            salary: { min: salaryMin, max: salaryMax }, status: "Open",
        });

        await newJob.save();
        res.status(201).json({ message: "Job created successfully", job: newJob });
    } catch (err) {
        console.error("HR create job error:", err.message);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: "Validation Error", details: err.errors });
        }
        res.status(500).json({ message: "Failed to create job" });
    }
};

// Updates an existing job posting (Manager only, security check is in the route)
exports.updateJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const updatedJob = await JobPosting.findByIdAndUpdate(jobId, req.body, { new: true });
        if (!updatedJob) return res.status(404).json({ message: "Job not found" });
        res.json({ message: "Job updated successfully", job: updatedJob });
    } catch (err) {
        console.error("HR update job error:", err.message);
        res.status(500).json({ message: "Failed to update job" });
    }
};

// Deletes a job posting (Manager only, security check is in the route)
exports.deleteJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const deletedJob = await JobPosting.findByIdAndDelete(jobId);
        if (!deletedJob) return res.status(404).json({ message: "Job not found" });
        await Candidate.deleteMany({ jobId: jobId });
        res.json({ message: "Job deleted successfully" });
    } catch (err) {
        console.error("HR delete job error:", err.message);
        res.status(500).json({ message: "Failed to delete job" });
    }
};

// Creates a new candidate
exports.createCandidate = async (req, res) => {
    try {
        const {
            firstName, lastName, email, phone, jobTitle, clientId, total_experience,
            relevant_experience, current_ctc, expected_ctc, current_location,
            preferred_location, notice_period, current_company, source, status, remarks
        } = req.body;

        if (!firstName || !email || !jobTitle || !clientId) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Security check: Recruiter must be assigned to this client
        if (req.user.role !== 'Manager' && !req.user.assignedClientIds.map(id => id.toString()).includes(clientId)) {
            return res.status(403).json({ message: "Forbidden: You are not assigned to this client" });
        }

        const job = await JobPosting.findOne({ title: jobTitle, clientId: clientId });
        if (!job) {
            return res.status(404).json({ message: "Job role not found for the selected client" });
        }

        const candidate = new Candidate({
            name: `${firstName} ${lastName || ""}`.trim(),
            email, phone, jobId: job._id, clientId, total_experience,
            relevant_experience, current_ctc, expected_ctc, current_location,
            preferred_location, notice_period, current_company, source,
            status: status || "Sourced", remarks,
            resume_url: req.file ? `uploads/resumes/${req.file.filename}` : "",
        });

        await candidate.save();
        res.status(201).json({ message: "Candidate added successfully", candidate });
    } catch (err) {
        console.error("Add candidate error:", err.message);
        res.status(500).json({ message: "Failed to add candidate", error: err.message });
    }
};

// Updates a candidate's information
exports.updateCandidate = async (req, res) => {
    try {
        const { candidateId } = req.params;
        const candidate = await Candidate.findById(candidateId);
        if (!candidate) return res.status(404).json({ message: "Candidate not found" });

        // Security check: Recruiter must be assigned to this candidate's client
        if (req.user.role !== 'Manager' && !req.user.assignedClientIds.map(id => id.toString()).includes(candidate.clientId.toString())) {
            return res.status(403).json({ message: "Forbidden: You cannot edit this candidate" });
        }
        
        const updatedCandidate = await Candidate.findByIdAndUpdate(candidateId, req.body, { new: true });
        res.json({ message: "Candidate updated successfully", candidate: updatedCandidate });
    } catch (err) {
        console.error("Update candidate error:", err.message);
        res.status(500).json({ message: "Failed to update candidate" });
    }
};

// Updates only a candidate's status
exports.updateCandidateStatus = async (req, res) => {
    try {
        const { candidateId } = req.params;
        const { status } = req.body;
        if (!status) return res.status(400).json({ message: "Status is required" });
        
        const candidate = await Candidate.findById(candidateId);
        if (!candidate) return res.status(404).json({ message: "Candidate not found" });
        
        // Security check: Recruiter must be assigned to this candidate's client
        if (req.user.role !== 'Manager' && !req.user.assignedClientIds.map(id => id.toString()).includes(candidate.clientId.toString())) {
            return res.status(403).json({ message: "Forbidden: You cannot update this candidate" });
        }
        
        candidate.status = status;
        await candidate.save();
        res.json({ message: "Candidate status updated", candidate });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: "Failed to update candidate status" });
    }
};

// Assigns a client to a specific recruiter
exports.assignClientToRecruiter = async (req, res) => {
    const { recruiterId, clientId } = req.body;
    if (!recruiterId || !clientId) {
        return res.status(400).json({ message: "Recruiter ID and Client ID are required." });
    }
    try {
        const recruiter = await HR.findById(recruiterId);
        if (!recruiter) {
            return res.status(404).json({ message: "Recruiter not found." });
        }
        if (recruiter.role !== 'Recruiter') {
            return res.status(400).json({ message: "Can only assign clients to Recruiters." });
        }
        if (!recruiter.assignedClientIds.includes(clientId)) {
            recruiter.assignedClientIds.push(clientId);
            await recruiter.save();
        }
        res.json({ message: `Client successfully assigned to ${recruiter.name}.` });
    } catch (err) {
        console.error("Error assigning client:", err.message);
        res.status(500).json({ message: "Failed to assign client." });
    }
};

// Fetches a paginated list of ALL candidates (for Managers)
exports.getAllCandidates = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        // --- MODIFIED --- Get status from the query
        const { status } = req.query;

        // --- MODIFIED --- Create a filter object
        const filter = {};
        if (status) { // Only add status to the filter if it exists
            filter.status = status;
        }

        // --- MODIFIED --- Use the filter in countDocuments
        const totalCandidates = await Candidate.countDocuments(filter); 
        
        // --- MODIFIED --- Use the filter in find
        const candidates = await Candidate.find(filter) 
            .populate('jobId', 'title') // Get the job title
            .populate('clientId', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
            
        res.json({
            candidates,
            // --- MODIFIED --- totalCandidates now correctly reflects the filtered count
            totalCandidates, 
            currentPage: page,
            totalPages: Math.ceil(totalCandidates / limit),
        });
    } catch (err) {
        console.error("Error fetching all candidates:", err.message);
        res.status(500).json({ message: "Failed to fetch all candidates" });
    }
};

// Searches ALL candidates by name or email (for Managers)
exports.searchAllCandidates = async (req, res) => {
    try {
        const { q: searchTerm } = req.query;
        if (!searchTerm || searchTerm.trim() === '') {
            return res.json([]);
        }
        
        const searchRegex = new RegExp(searchTerm, 'i');
        const candidates = await Candidate.find({
            $or: [{ name: { $regex: searchRegex } }, { email: { $regex: searchRegex } }]
        }).populate('jobId', 'title')
         .populate('clientId', 'name');;

        res.json(candidates);
    } catch (err) {
        console.error("Error searching all candidates:", err.message);
        res.status(500).json({ message: "Failed to search all candidates" });
    }
};

exports.getCandidatesByJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        // --- MODIFIED --- Get status from the query
        const { status } = req.query;

        // Security Check: Ensure the job exists and belongs to an assigned client
        const job = await JobPosting.findById(jobId);
        if (!job) {
            return res.status(404).json({ message: "Job not found" });
        }
        if (req.user.role !== 'Manager' && !req.user.assignedClientIds.map(id => id.toString()).includes(job.clientId.toString())) {
             return res.status(403).json({ message: "Forbidden: You are not assigned to this job's client." });
        }
        
        // --- MODIFIED --- Start building the query
        const query = { jobId: jobId };

        // --- MODIFIED --- Add status to the query if it exists
        if (status) {
            query.status = status;
        }
        
        // --- MODIFIED --- This now uses the query *with* the potential status filter
        const totalCandidates = await Candidate.countDocuments(query);
        
        // --- MODIFIED --- This also uses the query *with* the potential status filter
        const candidates = await Candidate.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
            
        res.json({
            candidates,
            totalCandidates, // This count is now correctly filtered
            currentPage: page,
            totalPages: Math.ceil(totalCandidates / limit),
        });
    } catch (err) {
        console.error("Error fetching candidates by job:", err.message);
        res.status(500).json({ message: "Failed to fetch candidates" });
    }
};

// Searches candidates within a SPECIFIC JOB
exports.searchCandidatesInJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        // --- MODIFIED --- Get both 'q' (searchTerm) and 'status' from the query
        const { q: searchTerm, status } = req.query;

        if (!searchTerm || searchTerm.trim() === '') {
            return res.json([]);
        }
        
        // Security Check: (Same as above)
        // Note: Assuming 'JobPosting' is your correct model name
        const job = await JobPosting.findById(jobId);
        if (!job) {
            return res.status(404).json({ message: "Job not found" });
        }
        // Note: Assuming 'req.user.assignedClientIds' is correct
        if (req.user.role !== 'Manager' && !req.user.assignedClientIds.map(id => id.toString()).includes(job.clientId.toString())) {
             return res.status(403).json({ message: "Forbidden" });
        }

        const searchRegex = new RegExp(searchTerm, 'i');

        // --- MODIFIED --- Build the filter object dynamically
        const filter = {
            jobId: jobId, // The key filter
            $or: [{ name: { $regex: searchRegex } }, { email: { $regex: searchRegex } }]
        };

        // If a status is provided in the query, add it to the filter
        if (status) {
            filter.status = status;
        }

        // --- MODIFIED --- Use the new 'filter' object in the find query
        const candidates = await Candidate.find(filter);

        res.json(candidates);
    } catch (err) {
        console.error("Error searching candidates in job:", err.message);
        res.status(500).json({ message: "Failed to search candidates" });
    }
};