import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
    // Kis job ke liye apply kiya
    job: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Job', 
        required: true 
    },
    // Candidate (Seeker) ki ID
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    }, 
    // Recruiter ki ID taaki uske dashboard mein dikhe
    recruiter: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    // Resume URL jo candidate ne upload kiya
    resume: { 
        type: String, 
        required: true 
    }, 
    status: {
        type: String,
        // ✅ 'shortlisted' add kiya hai kyunki aapke frontend mein wahi logic hai
        enum: ['pending', 'shortlisted', 'accepted', 'rejected'], 
        default: 'pending',
        lowercase: true // Taaki Case-sensitivity ka panga na ho
    },
    appliedAt: { 
        type: Date, 
        default: Date.now 
    }
}, { timestamps: true });

export default mongoose.model('Application', applicationSchema);