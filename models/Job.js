import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a job title'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  company: {
    type: String,
    required: [true, 'Please add a company name'],
    trim: true
  },
  location: { 
    type: String, 
    required: [true, 'Please add a location']
  },
  salaryRange: {
    type: String
  },
  experienceLevel: {
    type: String,
    enum: {
      values: ['Fresher / Entry Level', 'Intermediate', 'Senior Expert', 'Fresher', '1-3 years', '3-5 years', '5+ years'],
      message: '{VALUE} is not a valid experience level'
    },
    default: 'Fresher'
  },
  jobType: {
    type: String,
    enum: {
      values: ['Full-Time Job', 'Internship', 'Contract', 'Full-time', 'Part-time', 'Freelance'],
      message: '{VALUE} is not a valid job type'
    },
    default: 'Full-Time Job'
  },
  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active',
    lowercase: true
  },
  skillsRequired: {
    type: [String],
    default: []
  },
  perks: {
    type: [String],
    default: []
  },
  recruiter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      default: [86.9157, 24.8777] 
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 1. Geospatial Index
jobSchema.index({ coordinates: "2dsphere" });

// 2. Text Index
jobSchema.index({ title: 'text', company: 'text', location: 'text' });

// 3. Updated Pre-save Hook (NO NEXT NEEDED)
// Humne yahan 'async' use kiya hai, isliye 'next' ki zaroorat nahi hai
jobSchema.pre('save', async function() {
  if (this.coordinates) {
    const coords = this.coordinates.coordinates;
    if (!coords || !Array.isArray(coords) || coords.length !== 2) {
      this.coordinates.coordinates = [86.9157, 24.8777];
    }
  }
  // Yahan next() likhne ki zaroorat nahi hai, async handle kar lega
});

const Job = mongoose.models.Job || mongoose.model('Job', jobSchema);

export default Job;