const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * Super Admin Schema
 * Platform-level access.
 */
const SuperAdminSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

/**
 * Client Schema
 * Each client can have multiple job postings.
 */
const ClientSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, required: true, default: "client" },
  createdAt: { type: Date, default: Date.now },
});

/**
 * HR Schema
 * HRs are assigned to specific clients.
 */
const HRSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  assignedClientIds: [{ type: Schema.Types.ObjectId, ref: "Client" }],
  
  // --- ADD THIS SECTION ---
  role: {
    type: String,
    enum: ['Manager', 'Recruiter'], // The only allowed values for the role
    default: 'Recruiter'         // New HRs will automatically be created as 'Junior'
  },
  // --- END OF SECTION ---

  createdAt: { type: Date, default: Date.now },
});

/**
 * Job Posting Schema
 * Belongs to a client, referenced in candidates.
 */

const JobPostingSchema = new Schema({
    // --- Core Details & Client Association ---
    clientId: { 
        type: Schema.Types.ObjectId, 
        ref: "Client", 
        required: true,
        index: true // FIX: Consolidated into a single definition with an index
    },
    title: { 
        type: String, 
        required: true, 
        trim: true 
    },
    location: { 
        type: String, 
        required: true, // Location is a reasonable requirement for most jobs
        trim: true
    },
    
    // FIX: Made these fields optional to support both Client and HR forms
    department: {
        type: String,
        trim: true
    },
    assignedHr: { 
        type: Schema.Types.ObjectId, 
        ref: 'HR',
        index: true 
    },
    experienceLevel: { 
        type: String,
    },

    // --- Job Specifications ---
    description: { 
        type: String, 
        default: "" 
    },
    employmentType: { 
        type: String, 
        enum: ['Full-time', 'Part-time', 'Contract', 'Internship'], 
        default: 'Full-time' 
    },
    salary: {
        min: { type: Number },
        max: { type: Number }
    },
    
    // --- Timeline & Tracking ---
    deadline: { 
        type: Date 
    },
    status: { 
        type: String, 
        enum: ["Draft", "Open", "On Hold", "Closed", "Filled"], 
        default: "Open" 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
});


/**
 * Candidate Activity Schema
 * Tracks actions on a candidate by HRs.
 */
const ActivitySchema = new Schema({
  hrId: { type: Schema.Types.ObjectId, ref: "HR", required: true },
  activity_type: { type: String, required: true, trim: true }, // e.g. "Status Change", "Note Added"
  notes: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

/**
 * Candidate Schema
 * Belongs to a Job Posting and a Client.
 */
const CandidateSchema = new Schema({
  jobId: { type: Schema.Types.ObjectId, ref: "JobPosting", required: true, index: true },
  clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, default: "" },
  status: {
    type: String,
    enum: ["L1 Selected", "L2 Selected", "Final Selected", "Documentation",  "Offered", "Joined", "Archieve"],
    default: "L1 Selected",
  },
  resume_url: { type: String, default: "" },
  total_experience: { type: Number, default: 0 }, // Stored in months or years
  relevant_experience: { type: Number, default: 0 },
  current_ctc: { type: Number, default: 0 }, // Stored in annual INR
  expected_ctc: { type: Number, default: 0 },
  current_location: { type: String, default: "" },
  preferred_location: { type: String, default: "" },
  notice_period: { type: Number, default: 0 }, // Stored in days
  current_company: { type: String, default: "" },
  source: { type: String, default: "" },
  remarks: { type: String, default: "" },
  activity: [ActivitySchema],
}, { timestamps: true }); // Automatically adds createdAt and updatedAt

// Models
const SuperAdmin = mongoose.model("SuperAdmin", SuperAdminSchema);
const Client = mongoose.model("Client", ClientSchema);
const HR = mongoose.model("HR", HRSchema);
const JobPosting = mongoose.model("JobPosting", JobPostingSchema);
const Candidate = mongoose.model("Candidate", CandidateSchema);

module.exports = { SuperAdmin, Client, HR, JobPosting, Candidate };
