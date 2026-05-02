import express from 'express';
import { 
    applyForJob, 
    getMyApplications, 
    getJobApplications, 
    getRecruiterApplications, 
    updateApplicationStatus 
} from '../controllers/applicationController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// ======================================================
// 1. SEEKER ROUTES (Candidates)
// ======================================================

/**
 * @route   POST /api/v1/application/apply/:jobId
 * @desc    Job apply karne ke liye
 * @access  Private (Seeker only)
 */
router.post('/apply/:jobId', protect, authorize('seeker'), applyForJob);

/**
 * @route   GET /api/v1/application/my-applications
 * @desc    Seeker apni saari applied jobs aur unka status dekh sakta hai
 * @access  Private (Seeker only)
 */
router.get('/my-applications', protect, authorize('seeker'), getMyApplications);


// ======================================================
// 2. RECRUITER ROUTES (Recruiters)
// ======================================================

/**
 * @route   GET /api/v1/application/recruiter/get
 * @desc    Recruiter apne dwara post ki gayi jobs ki applications dekh sakta hai
 * @access  Private (Recruiter only)
 */
router.get('/recruiter/get', protect, authorize('recruiter'), getRecruiterApplications);

// Dashboards aur compatibility ke liye backup routes
router.get('/recruiter', protect, authorize('recruiter'), getRecruiterApplications);
router.get('/recruiter/all', protect, authorize('recruiter'), getRecruiterApplications);

/**
 * @route   GET /api/v1/application/job/:jobId
 * @desc    Kisi specific job ki saari applications dekhne ke liye
 * @access  Private (Recruiter only)
 */
router.get('/job/:jobId', protect, authorize('recruiter'), getJobApplications);

/**
 * @route   POST /api/v1/application/status/:id/update
 * @desc    Candidate ka status (Accepted/Rejected) update karne ke liye
 * @access  Private (Recruiter only)
 * ✅ Frontend call: api.post(`/application/status/${id}/update`, { status })
 */
router.post('/status/:id/update', protect, authorize('recruiter'), updateApplicationStatus);

export default router;