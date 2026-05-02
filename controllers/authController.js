import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto'; 
import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js';

// --- HELPER: Send Token Response ---
const sendTokenResponse = (user, statusCode, res, req) => {
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secretkey', { 
    expiresIn: '30d' 
  });

  const options = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    secure: process.env.NODE_ENV === 'production'
  };

  const userData = user.toObject();
  delete userData.password;

  // ✅ RESUME URL FIX
  if (userData.resume) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    userData.resumeUrl = `${baseUrl}/uploads/resumes/${userData.resume}`;
  }

  return res.status(statusCode).cookie('token', token, options).json({ 
    success: true, 
    token, 
    user: userData,
    data: userData 
  });
};

// --- 1. REGISTER ---
export const register = async (req, res) => {
  try {
    const { name, email, password, role, mobile, skills } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Please provide all required fields" });
    }
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const finalRole = role ? role.toLowerCase() : 'seeker';
    
    let formattedSkills = [];
    if (Array.isArray(skills)) {
      formattedSkills = skills.map(s => s.toLowerCase().trim());
    } else if (typeof skills === 'string' && skills.trim() !== "") {
      formattedSkills = skills.split(',').map(s => s.trim().toLowerCase()).filter(s => s !== "");
    }

    const user = await User.create({
      name, 
      email, 
      password, 
      role: finalRole,
      mobile: mobile || "",
      skills: formattedSkills,
      experience: [], 
      companyDetails: finalRole === 'recruiter' ? {
        name: "", website: "", description: "", industry: "", location: ""
      } : undefined
    });

    return sendTokenResponse(user, 201, res, req);
  } catch (error) {
    console.error("🔥 REGISTER ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// --- 2. LOGIN ---
export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }
    
    const user = await User.findOne({ email }).select('+password');
    
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (role && user.role !== role.toLowerCase()) {
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. Registered as ${user.role}.` 
      });
    }

    return sendTokenResponse(user, 200, res, req);
  } catch (error) {
    console.error("🔥 LOGIN ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// --- 3. GET PROFILE ---
export const getMe = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const user = await User.findById(userId).select('-password').populate('savedJobs');
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const userData = user.toObject();
    
    if (userData.resume) {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        userData.resumeUrl = `${baseUrl}/uploads/resumes/${userData.resume}`;
    }

    res.status(200).json({ success: true, user: userData, data: userData });
  } catch (error) {
    console.error("🔥 GET_ME ERROR:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// --- 4. UPDATE PROFILE ---
export const updateProfile = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id; 
        if (!userId) {
            return res.status(401).json({ success: false, message: "Not authorized" });
        }

        const { name, email, mobile, skills, summary, bio, experience, location, experienceLevel, companyDetails } = req.body;
        
        const updateData = {};
        
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (mobile !== undefined) updateData.mobile = mobile;
        if (location !== undefined) updateData.location = location;
        if (experienceLevel) updateData.experienceLevel = experienceLevel;
        
        if (summary !== undefined || bio !== undefined) {
            const finalBio = summary || bio || "";
            updateData.summary = finalBio;
            updateData.bio = finalBio;
        }

        if (skills !== undefined) {
            if (typeof skills === 'string') {
                updateData.skills = skills.split(',').map(s => s.trim().toLowerCase()).filter(s => s !== "");
            } else if (Array.isArray(skills)) {
                updateData.skills = skills.map(s => s.toString().toLowerCase().trim());
            }
        }

        if (experience !== undefined) {
            updateData.experience = Array.isArray(experience) ? experience : [];
        }
        
        if (companyDetails) updateData.companyDetails = companyDetails;

        const user = await User.findByIdAndUpdate(
            userId, 
            { $set: updateData }, 
            { new: true, runValidators: false } 
        ).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const userData = user.toObject();
        if (userData.resume) {
            userData.resumeUrl = `${req.protocol}://${req.get('host')}/uploads/resumes/${userData.resume}`;
        }

        res.status(200).json({ 
            success: true, 
            message: "Profile updated successfully",
            user: userData
        });

    } catch (error) {
        console.error("🔥 UPDATE ERROR:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Sync Failed: " + error.message 
        });
    }
};

// --- 5. FORGOT PASSWORD ---
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found with this email." });
    }

    // 1. Generate Random Token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // 2. Hash and set to resetPasswordToken field in DB
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // 3. Set expire time (15 minutes)
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; 

    await user.save({ validateBeforeSave: false });

    // 4. Create reset URL (Frontend URL)
    // Localhost ki jagah IP ka use karein (agar mobile se test karna hai)
const resetUrl = `http://192.168.1.5:5173/reset-password/${resetToken}`;
    const message = `You requested a password reset for Orbit Nodes. Please click on the link below:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.`;

    try {
      // 5. Send Email via Nodemailer utility
      await sendEmail({
        email: user.email,
        subject: 'Orbit Nodes - Password Reset Request',
        message
      });

      res.status(200).json({ success: true, message: "Reset link sent to your email." });
    } catch (err) {
      // Cleanup tokens if email fails
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ success: false, message: "Email could not be sent. Check your SMTP settings." });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- 6. RESET PASSWORD ---
export const resetPassword = async (req, res) => {
  try {
    // Get hashed token from URL params
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    // Find user with valid token and not expired
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset token." });
    }

    // Set new password (Model's .pre('save') will hash this)
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    
    await user.save();

    res.status(200).json({ success: true, message: "Password updated successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- 7. LOGOUT ---
export const logout = async (req, res) => {
  res.cookie('token', 'none', { expires: new Date(Date.now() + 5 * 1000), httpOnly: true });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// --- 8. DELETE RESUME ---
export const deleteResume = async (req, res) => {
    try {
        const userId = req.user?._id || req.user?.id;
        await User.findByIdAndUpdate(userId, { $set: { resumes: [], resume: null } });
        res.status(200).json({ success: true, message: "Resume removed" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};