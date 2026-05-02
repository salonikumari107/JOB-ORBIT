import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// ✅ 1. PROTECT MIDDLEWARE
export const protect = async (req, res, next) => {
    try {
        let token;

        // Token extraction (Header aur Cookies dono check karega)
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({ success: false, message: "Not authorized. No token found." });
        }

        // Token verify karein
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // User ko database se fetch karein
        const user = await User.findById(decoded.id || decoded._id).select('-password');
        
        if (!user) {
            return res.status(401).json({ success: false, message: "User not found with this token." });
        }

        // Request object mein user attach karein
        req.user = user;

        // Simple next() call (Extra checks ki zaroorat nahi hoti)
        next();

    } catch (err) {
        console.error("❌ Auth Error:", err.message);
        return res.status(401).json({ 
            success: false, 
            message: err.name === 'TokenExpiredError' ? "Session Expired. Please login again." : "Invalid Token" 
        });
    }
};

// ✅ 2. AUTHORIZE MIDDLEWARE
export const authorize = (...roles) => {
    return (req, res, next) => {
        // Pehle check karein ki req.user exist karta hai
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Not authorized. User data missing." });
        }

        // Role match karein
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: `User role '${req.user.role}' is not authorized.` 
            });
        }

        // Sab sahi hai toh next function call karein
        next();
    };
};