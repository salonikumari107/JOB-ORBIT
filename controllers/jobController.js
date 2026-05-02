import Job from '../models/Job.js';
import Application from '../models/Application.js';
import User from '../models/User.js';
import axios from 'axios';
import mongoose from 'mongoose';

// --- 1. CREATE JOB (With Debugging Logs) ---
export const createJob = async (req, res) => {
    try {
        console.log("Starting createJob controller...");

        if (!req.user) {
            console.log("No user found in request");
            return res.status(401).json({ success: false, message: "Login Required" });
        }

        let { skillsRequired, location, experienceLevel, jobType } = req.body;
        let finalCoordinates = { type: 'Point', coordinates: [86.9157, 24.8777] }; 

        if (location) {
            try {
                const encodedLocation = encodeURIComponent(location);
                const geoRes = await axios.get(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodedLocation}&limit=1`,
                    { headers: { 'User-Agent': 'OrbitNodes/1.0' }, timeout: 5000 }
                );
                if (geoRes.data && geoRes.data.length > 0) {
                    finalCoordinates = {
                        type: 'Point',
                        coordinates: [parseFloat(geoRes.data[0].lon), parseFloat(geoRes.data[0].lat)]
                    };
                }
            } catch (geoErr) { 
                console.error("Geocoding failed, using default coordinates"); 
            }
        }

        const skillsArray = Array.isArray(skillsRequired) ? skillsRequired : 
                          (typeof skillsRequired === 'string' ? skillsRequired.split(',').map(s => s.trim()) : []);

        console.log("Attempting to save job to Database...");
        const job = await Job.create({
            ...req.body,
            recruiter: req.user._id,
            skillsRequired: skillsArray,
            coordinates: finalCoordinates,
            experienceLevel: experienceLevel || 'Fresher',
            jobType: jobType || 'Full-Time Job'
        });

        console.log("Job created successfully!");
        return res.status(201).json({ success: true, data: job, message: "Job Posted Successfully!" });

    } catch (err) {
        console.log("CRITICAL ERROR FOUND IN CREATEJOB:");
        console.error(err); 
        return res.status(500).json({ 
            success: false, 
            message: "Internal Server Logic Error", 
            errorDetail: err.message 
        });
    }
};

// --- 2. GET JOBS (All) ---
export const getJobs = async (req, res) => {
    try {
        const jobs = await Job.find({}).populate('recruiter', 'name email company').sort('-createdAt');
        return res.status(200).json({ success: true, count: jobs.length, data: jobs });
    } catch (err) { 
        console.log("Error in getJobs:", err.message);
        return res.status(500).json({ success: false, message: err.message }); 
    }
};

// --- 3. GET NEARBY JOBS ---
export const getNearbyJobs = async (req, res) => {
    try {
        const { lat, lng, distance = 500 } = req.query; 
        if (!lat || !lng) {
            return res.status(400).json({ success: false, message: "Latitude and Longitude are required." });
        }
        const radius = parseFloat(distance) / 6378.1; 
        const jobs = await Job.find({
            coordinates: {
                $geoWithin: { $centerSphere: [[parseFloat(lng), parseFloat(lat)], radius] }
            }
        }).populate('recruiter', 'name email company');
        return res.status(200).json({ success: true, count: jobs.length, data: jobs });
    } catch (error) {
        console.log("Error in getNearbyJobs:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// --- 4. GET SINGLE JOB ---
export const getJob = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid Job ID format" });
        }
        const job = await Job.findById(req.params.id).populate('recruiter', 'name email company');
        if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
        return res.status(200).json({ success: true, data: job });
    } catch (err) { 
        console.log("Error in getJob:", err.message);
        return res.status(500).json({ success: false, message: err.message }); 
    }
};

// --- 5. UPDATE & DELETE ---
export const updateJob = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        let job = await Job.findById(req.params.id);
        if (!job || job.recruiter.toString() !== userId.toString()) {
            return res.status(401).json({ success: false, message: 'Not authorized' });
        }
        job = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        return res.status(200).json({ success: true, data: job });
    } catch (err) { 
        console.log("Error in updateJob:", err.message);
        return res.status(500).json({ success: false, message: err.message }); 
    }
};

export const deleteJob = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const job = await Job.findById(req.params.id);
        if (!job || job.recruiter.toString() !== userId.toString()) {
            return res.status(401).json({ success: false, message: "Not authorized" });
        }
        await Application.deleteMany({ job: req.params.id });
        await job.deleteOne();
        return res.status(200).json({ success: true, message: "Deleted successfully" });
    } catch (err) { 
        console.log("Error in deleteJob:", err.message);
        return res.status(500).json({ success: false, message: err.message }); 
    }
};

// --- 6. DASHBOARDS ---
export const getMyPostedJobs = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const jobs = await Job.find({ recruiter: userId }).sort("-createdAt");
        return res.status(200).json({ success: true, data: jobs });
    } catch (err) { 
        console.log("Error in getMyPostedJobs:", err.message);
        return res.status(500).json({ success: false, message: err.message }); 
    }
};

export const getRecruiterDashboard = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const myJobs = await Job.find({ recruiter: userId });
        const applications = await Application.find({ job: { $in: myJobs.map(j => j._id) } })
            .populate('seeker', 'name email skills').populate('job', 'title').sort({ createdAt: -1 });
        return res.status(200).json({ success: true, data: applications });
    } catch (err) { 
        console.log("Error in getRecruiterDashboard:", err.message);
        return res.status(500).json({ success: false, message: err.message }); 
    }
};

// --- 7. APPLICATIONS ---
export const applyToJob = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const alreadyApplied = await Application.findOne({ job: req.params.id, seeker: userId });
        if (alreadyApplied) return res.status(400).json({ success: false, message: 'Already applied' });
        const application = await Application.create({ job: req.params.id, seeker: userId, status: 'applied' });
        return res.status(201).json({ success: true, data: application });
    } catch (err) { 
        console.log("Error in applyToJob:", err.message);
        return res.status(500).json({ success: false, message: err.message }); 
    }
};

export const getMyApplications = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const apps = await Application.find({ seeker: userId }).populate('job').sort('-createdAt');
        return res.status(200).json({ success: true, data: apps });
    } catch (err) { 
        console.log("Error in getMyApplications:", err.message);
        return res.status(500).json({ success: false, message: err.message }); 
    }
};

// --- 8. SAVED JOBS & STATUS ---
export const getSavedJobs = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const user = await User.findById(userId).populate('savedJobs');
        return res.status(200).json({ success: true, data: user.savedJobs });
    } catch (err) { 
        console.log("Error in getSavedJobs:", err.message);
        return res.status(500).json({ success: false, message: err.message }); 
    }
};

export const toggleSaveJob = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const user = await User.findById(userId);
        const isSaved = user.savedJobs.includes(req.params.id);
        const action = isSaved ? { $pull: { savedJobs: req.params.id } } : { $addToSet: { savedJobs: req.params.id } };
        const updated = await User.findByIdAndUpdate(userId, action, { new: true }).populate('savedJobs');
        return res.status(200).json({ success: true, isSaved: !isSaved, data: updated.savedJobs });
    } catch (err) { 
        console.log("Error in toggleSaveJob:", err.message);
        return res.status(500).json({ success: false, message: err.message }); 
    }
};

export const toggleJobStatus = async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        job.status = job.status === 'active' ? 'closed' : 'active';
        await job.save();
        return res.status(200).json({ success: true, message: `Job status is now ${job.status}`, data: job });
    } catch (err) { 
        console.log("Error in toggleJobStatus:", err.message);
        return res.status(500).json({ success: false, message: err.message }); 
    }
};

export const updateApplicationStatus = async (req, res) => {
    try {
        const app = await Application.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
        return res.status(200).json({ success: true, data: app });
    } catch (err) { 
        console.log("Error in updateApplicationStatus:", err.message);
        return res.status(500).json({ success: false, message: err.message }); 
    }
};

// --- 9. RESUME MANAGEMENT ---
export const uploadResume = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded." });
        const user = await User.findByIdAndUpdate(userId, { resume: req.file.path }, { new: true });
        return res.status(200).json({ success: true, message: "Resume uploaded successfully", data: user, resumePath: req.file.path });
    } catch (err) { 
        console.log("Error in uploadResume:", err.message);
        return res.status(500).json({ success: false, message: err.message }); 
    }
};

// ✅ NEW: DELETE RESUME Logic
export const deleteResume = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        // User record mein se resume path ko null kar do
        await User.findByIdAndUpdate(userId, { resume: null });
        
        return res.status(200).json({ 
            success: true, 
            message: "Resume deleted successfully" 
        });
    } catch (err) {
        console.log("Error in deleteResume:", err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
};