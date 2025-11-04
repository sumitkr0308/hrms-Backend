const fs = require("fs");
const pdf = require("pdf-parse");
const mammoth = require("mammoth"); // <-- Make sure you have installed this

exports.parseResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    let extractedText = "";
    const filePath = req.file.path; // The path to the file on disk

    // --- MODIFIED --- Check the file type to use the correct parser
    if (req.file.mimetype === "application/pdf") {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdf(dataBuffer);
      extractedText = pdfData.text;

    } else if (req.file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      // This is for .docx files
      const { value } = await mammoth.extractRawText({ path: filePath });
      extractedText = value;

    } else if (req.file.mimetype === "text/plain" || req.file.mimetype === "application/rtf") {
      // This is for .txt and .rtf files
      extractedText = fs.readFileSync(filePath, "utf8");
    
    } else if (req.file.mimetype === "application/msword") {
      // .doc files are very difficult to parse.
      return res.status(400).json({ error: "Classic .doc files are not supported. Please save as .docx or .pdf." });
    
    } else {
      return res.status(400).json({ error: "Unsupported file type." });
    }
    // --- END MODIFIED ---

    if (!extractedText) {
        return res.status(500).json({ error: "Could not extract text from the resume." });
    }
    
    res.json({ message: "Resume parsed successfully", extractedText: extractedText });

  } catch (err) {
    console.error("Resume upload error:", err.message);
    res.status(500).json({ error: "Failed to parse resume" });
  
  } finally {
    // --- NEW (Better) ---
    // This runs whether the 'try' succeeds or the 'catch' fails.
    // It guarantees the temp file is deleted.
    if (req.file) {
      fs.unlink(req.file.path, (err) => { // Use async unlink
        if (err) console.error("Error deleting temp resume file:", err);
      });
    }
  }
};