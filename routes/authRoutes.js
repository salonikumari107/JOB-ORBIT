import express from 'express';
import multer from 'multer';
import path from 'path'; 
import mongoose from 'mongoose';
import { 
    register, 
    login, 
    logout, 
    getMe, 
    updateProfile,
    deleteResume,
    forgotPassword, 
    resetPassword  
} from '../controllers/authController.js'; 

import { protect, authorize } from '../middleware/auth.js'; 
import User from '../models/User.js'; 

const router = express.Router();

// --- 1. MULTER CONFIGURATION (For Resumes) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/resumes/'); 
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, 
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') cb(null, true);
        else cb(new Error('Only PDF files allowed!'), false);
    }
});

// --- 2. PUBLIC AUTH ROUTES ---
router.post('/register', register); 
router.post('/login', login);
router.get('/logout', logout); 

// --- 3. PASSWORD RECOVERY ROUTES (No 'protect' needed here) ---
router.post('/forgot-password', forgotPassword); // URL: /api/v1/auth/forgot-password
router.put('/reset-password/:token', resetPassword); // URL: /api/v1/auth/reset-password/:token

// --- 4. PROTECTED USER ROUTES (Requires Login) ---
router.get('/me', protect, getMe); 
router.put('/profile', protect, updateProfile); 
router.put('/profile-update', protect, updateProfile); 

// --- 5. RESUME MANAGEMENT (Seeker Only) ---
router.post('/upload-resume', protect, authorize('seeker'), (req, res, next) => {
    upload.single('resume')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, message: "Multer Error: " + err.message });
        } else if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "Please upload a PDF file" });
        
        const filePath = `uploads/resumes/${req.file.filename}`;
        
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { 
                resume: filePath, 
                $push: { resumes: { name: req.file.originalname, url: req.file.filename, isDefault: true } } 
            },
            { new: true }
        );

        return res.status(200).json({ 
            success: true, 
            user,
            message: "Resume uploaded successfully" 
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message }); 
    }
});

router.delete('/resume/:resumeId', protect, authorize('seeker'), deleteResume);

// --- 6. JOB INTERACTION ROUTES (Seeker Only) ---
router.post('/save-job/:jobId', protect, authorize('seeker'), async (req, res) => {
    try {
        const { jobId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ success: false, message: "Invalid Job ID" });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        if (!user.savedJobs) user.savedJobs = [];

        const isAlreadySaved = user.savedJobs.some(id => id.toString() === jobId);
        const update = isAlreadySaved ? { $pull: { savedJobs: jobId } } : { $addToSet: { savedJobs: jobId } };

        let updatedUser;
        try {
            updatedUser = await User.findByIdAndUpdate(req.user.id, update, { new: true }).populate('savedJobs');
        } catch (popError) {
            updatedUser = await User.findByIdAndUpdate(req.user.id, update, { new: true });
        }

        return res.status(200).json({ 
            success: true, 
            message: isAlreadySaved ? "Job unsaved" : "Job saved", 
            user: updatedUser 
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server Error: " + error.message });
    }
});

export default router;