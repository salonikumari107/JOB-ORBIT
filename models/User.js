import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  mobile: {
    type: String,
    default: ""
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false 
  },
  role: {
    type: String,
    enum: ['seeker', 'recruiter'],
    default: 'seeker'
  },
  summary: {
    type: String,
    default: ""
  },
  bio: {
    type: String,
    default: ""
  },
  experienceLevel: {
    type: String,
    default: 'Fresher'
  },
  location: {
    type: String,
    default: ""
  },
  skills: {
    type: [String],
    default: []
  },
  experience: [
    {
      company: { type: String, default: "" },
      position: { type: String, default: "" },
      duration: { type: String, default: "" },
      description: { type: String, default: "" }
    }
  ],
  savedJobs: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    }
  ],
  companyDetails: {
    name: { type: String, default: "" },
    website: { type: String, default: "" },
    description: { type: String, default: "" },
    industry: { type: String, default: "" }, 
    location: { type: String, default: "" }, 
    taxId: { type: String, default: "" },    
    verified: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  strict: false 
});

// --- 1. Password Hashing (Corrected Modern Async Syntax) ---
// Yahan humne 'next' parameter hata diya hai kyunki async functions 
// automatically resolve hote hain.
userSchema.pre('save', async function() {
  // Agar password modify nahi hua toh process ko yahin rok do
  if (!this.isModified('password')) return;

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    throw new Error(err); 
  }
});

// --- 2. Password Match Method ---
userSchema.methods.matchPassword = async function(enteredPassword) {
  // 'this.password' tabhi milega jab query mein .select('+password') use kiya ho
  return await bcrypt.compare(enteredPassword, this.password);
};

// --- 3. Export Model ---
const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;