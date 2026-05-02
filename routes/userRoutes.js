import express from 'express';
import { protect } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import User from '../models/User.js';

const router = express.Router();

// @desc    Upload resume
// @route   POST /api/users/resume
// @access  Private/Seeker
router.post('/resume', protect, (req, res, next) => {
  console.log('Incoming headers:', req.headers['content-type']);
  upload.single('resume')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    }
    console.log('Multer finished. File:', req.file);
    next();
  });
}, async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file received. Ensure the field name is "resume"' });
    }

    console.log('User from token:', req.user);
    console.log('User ID:', req.user._id);
    console.log('File:', req.file);

    // Save only the filename or a relative path for the URL
    const relativePath = `uploads/${req.file.filename}`;
    
    // Use findByIdAndUpdate with $push to avoid triggering pre-save hooks
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $push: {
          resumes: {
            url: relativePath,
            name: req.file.originalname
          }
        }
      },
      { new: true }
    );

    console.log('Updated user:', user);
    console.log('Resumes after update:', user?.resumes);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, data: user.resumes });
  } catch (err) {
    console.error('Resume upload error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// @desc    Update profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
