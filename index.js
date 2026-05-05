import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs'; 
import morgan from 'morgan';
import { fileURLToPath } from 'url'; 
import mongoose from 'mongoose';

dotenv.config(); 

import authRoutes from './routes/authRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- DATABASE CONNECTION ---
const connectDB = async () => {
    try {
        // Aapki current configuration ke hisaab se MONGO_URI env se li gayi hai
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ MongoDB Connected Successfully!");
    } catch (error) {
        console.error("❌ MongoDB Error:", error.message);
        process.exit(1);
    }
};

connectDB(); 

// --- MIDDLEWARES ---
app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174"], 
    credentials: true, 
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser()); 

// ✅ STATIC FILES SETUP (Resume View karne ke liye zaroori hai)
// Isse http://localhost:8001/uploads/filename.pdf wala path kaam karne lagega
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- ROUTES ---
// Frontend ke sath match karne ke liye /v1 prefix ka use kiya gaya hai
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1/application', applicationRoutes); 

// --- SERVER START ---
const PORT = process.env.PORT || 8001; 
app.listen(PORT, () => {
  console.log(`🚀 SERVER RUNNING ON PORT: ${PORT}`);
});