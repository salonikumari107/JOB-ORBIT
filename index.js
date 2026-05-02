import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs'; 
import morgan from 'morgan';
import { fileURLToPath } from 'url'; 

dotenv.config(); 
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';

// --- ES MODULE DIRNAME SETUP ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
connectDB();

// --- 1. MIDDLEWARES ---
app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175","http://localhost:5178", process.env.FRONTEND_URL].filter(Boolean), 
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser()); 

// --- 2. UPLOADS SETUP (ABSOLUTE PATH FIX) ---
const uploadsPath = path.resolve(__dirname, 'uploads');
const resumesPath = path.resolve(uploadsPath, 'resumes');

// Folder verify/create karein
if (!fs.existsSync(resumesPath)) {
    fs.mkdirSync(resumesPath, { recursive: true });
    console.log("📁 Resumes folder created at:", resumesPath);
}

// ✅ FIXED STATIC SERVING:
// Is line se 'uploads' folder ke andar ki har cheez bahar access ho jayegi
app.use('/uploads', express.static(uploadsPath));

// Debugging Middleware: Ye terminal mein batayega ki request kis path par aa rahi hai
app.use('/uploads', (req, res, next) => {
    const fullPath = path.join(uploadsPath, req.url);
    console.log(`🔎 Checking for file at: ${fullPath}`);
    
    if (fs.existsSync(fullPath)) {
        console.log("✅ File found on disk!");
    } else {
        console.warn("❌ File NOT found on disk at this path.");
    }
    next();
});

// --- 3. API ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/application', applicationRoutes); 

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'Orbit Nodes API is running' });
});

// --- 4. ERROR HANDLERS ---
app.use((req, res) => {
    res.status(404).json({ success: false, message: "Route not found" });
});

app.use((err, req, res, next) => {
    console.error("🔥 ERROR:", err.message);
    res.status(err.statusCode || 500).json({ 
        success: false, 
        message: err.message || 'Internal Server Error' 
    });
});

// --- 5. SERVER START ---
const PORT = process.env.PORT || 8000; 
app.listen(PORT, () => {
  console.log(`🚀 SERVER RUNNING ON PORT: ${PORT}`);
  console.log(`📂 Uploads Root: ${uploadsPath}`);
  console.log(`📄 Resumes Folder: ${resumesPath}`);
  console.log(`🔗 Test Resume URL: http://localhost:${PORT}/uploads/resumes/your_test_file.pdf`);
});