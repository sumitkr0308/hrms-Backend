const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure the directory exists
fs.mkdirSync("uploads/resumes", { recursive: true });

// --- NEW --- Define the filter function
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf', // .pdf
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/rtf', // .rtf
    'text/plain' // .txt
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true); // Accept the file
  } else {
    // Reject the file
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, RTF, or TXT are allowed.'), false);
  }
};
// --- END NEW ---

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/resumes/"),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// --- MODIFIED --- Add the fileFilter and a file size limit
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Optional: 5MB file size limit
});

module.exports = upload;