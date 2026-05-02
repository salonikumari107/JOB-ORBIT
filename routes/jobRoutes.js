import express from 'express';
import { 
    getJobs, 
    getJob, 
    createJob, 
    updateJob, 
    deleteJob, 
    applyToJob,                        
    getRecruiterDashboard,
    updateApplicationStatus,
    toggleSaveJob,
    getSavedJobs,
    uploadResume,
    getMyApplications,
    getMyPostedJobs,   
    toggleJobStatus,
    getNearbyJobs 
} from '../controllers/jobController.js';

import { protect, authorize } from '../middleware/auth.js'; 
import { upload } from '../middleware/upload.js'; 

const router = express.Router();

// --- 1. SEARCH & LOCATION (Public) ---
// Inko sabse upar rakha hai taaki dynamic IDs se conflict na ho
router.get('/nearby', getNearbyJobs); 
router.get('/near-me', getNearbyJobs); 

// --- 2. RECRUITER SPECIFIC ---
router.get('/recruiter/dashboard', protect, authorize('recruiter'), getRecruiterDashboard);
router.get('/my-jobs', protect, authorize('recruiter'), getMyPostedJobs);

// --- 3. SEEKER SPECIFIC ---
router.get('/saved', protect, getSavedJobs); 
router.get('/my-applications', protect, authorize('seeker'), getMyApplications); 
router.post('/upload-resume', protect, authorize('seeker'), upload.single('resume'), uploadResume);

// --- 4. CORE JOB CRUD ---
router.get('/', getJobs); 
router.post('/', protect, authorize('recruiter'), createJob); // ✅ Direct call, no test function

// --- 5. DYNAMIC PARAMETERS (Hamesha Sabse Niche) ---
router.get('/:id', getJob); 
router.put('/:id', protect, authorize('recruiter'), updateJob);
router.delete('/:id', protect, authorize('recruiter'), deleteJob);

// --- 6. ACTIONS ---
router.post('/:id/apply', protect, authorize('seeker'), applyToJob);
router.post('/save/:id', protect, toggleSaveJob); 
router.put('/application/:id/status', protect, authorize('recruiter'), updateApplicationStatus);
router.put('/toggle-status/:id', protect, authorize('recruiter'), toggleJobStatus);

export default router;