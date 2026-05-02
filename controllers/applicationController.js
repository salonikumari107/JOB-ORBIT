import Application from '../models/Application.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
// Aapke utility ka updated name
import sendJobStatusEmail from '../utils/sendEmail.js'; 

// ✅ 1. APPLY FOR JOB
// ✅ 1. APPLY FOR JOB (Updated with Fix)
export const applyForJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;
    // Frontend se 'resume' ya 'resumeId' jo bhi aaye, usey capture karein
    const { resume, resumeId } = req.body; 

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });

    const alreadyApplied = await Application.findOne({ job: jobId, user: userId });
    if (alreadyApplied) return res.status(400).json({ success: false, message: "Already applied for this node." });

    const application = await Application.create({
      job: jobId,
      user: userId,
      recruiter: job.recruiter, 
      status: 'pending',
      // Fix: Agar frontend 'resume' bhej raha hai toh wo, nahi toh 'resumeId'
      resume: resume || resumeId 
    });

    res.status(201).json({ success: true, message: "Applied Successfully!", data: application });
  } catch (err) {
    console.error("Apply Error:", err);
    // Validation error details print karne ke liye
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ 2. GET MY APPLICATIONS (Candidates ke liye - Updated Logic)
export const getMyApplications = async (req, res) => {
    try {
        // req.user.id 'protect' middleware se aa rahi hai
        // Database mein 'user' field se match karke saari applications nikal rahe hain
        const applications = await Application.find({ user: req.user.id }) 
            // Sabse Important: Yahan 'job' model se title aur companyName fetch kar rahe hain
            .populate({
                path: 'job',
                select: 'title companyName location' 
            }) 
            .sort({ createdAt: -1 });

        // Frontend check karein: Agar wo 'data' maang raha hai ya 'applications'
        res.status(200).json({ 
            success: true, 
            applications: applications, // Dono bhej rahe hain taaki frontend crash na ho
            data: applications 
        });
    } catch (error) {
        console.error("Fetch Applications Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ✅ 3. GET JOB APPLICATIONS (Specific Job ke applicants dekhne ke liye)
export const getJobApplications = async (req, res) => {
  try {
    const { jobId } = req.params;
    const applications = await Application.find({ job: jobId })
      .populate('user', 'name email mobile resume')
      .sort('-createdAt');
    res.status(200).json({ success: true, data: applications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ 4. GET ALL APPLICATIONS FOR RECRUITER (CandidateHub display ke liye)
export const getRecruiterApplications = async (req, res) => {
  try {
    const recruiterId = req.user.id || req.id; 

    const applications = await Application.find({ recruiter: recruiterId })
      .populate('job', 'title') 
      .populate('user', 'name email mobile resume profile') 
      .sort('-createdAt');

    res.status(200).json({ 
      success: true, 
      applications: applications 
    });
  } catch (err) {
    console.error("Recruiter Hub Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ 5. UPDATE STATUS (Status update + Email Trigger)
export const updateApplicationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        console.log("-----------------------------------------");
        console.log("🚀 API HIT: Update Status for ID:", id);
        console.log("Changing status to:", status);

        const application = await Application.findById(id).populate('user job');

        if (!application) {
            console.log("❌ Application not found in DB");
            return res.status(404).json({ message: "Application not found" });
        }

        application.status = status;
        await application.save();

        console.log("✅ DB Updated. Now sending email to:", application.user.email);

        // Mail bhejte waqt logs check karein
        await sendJobStatusEmail(
            application.user.email,
            application.user.name,
            application.job.title,
            status
        );

        console.log("📧 Mail Function execution finished");
        console.log("-----------------------------------------");

        res.status(200).json({ success: true, message: `Status updated to ${status}` });

    } catch (error) {
        console.error("🔥 Error in updateApplicationStatus:", error);
        res.status(500).json({ message: "Server Error" });
    }
};