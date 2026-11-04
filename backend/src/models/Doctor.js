import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: 'Dr. Chirag Paghdal',
      trim: true,
    },
    username: {
      type: String,
      default: 'dhyey',
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    clinicName: {
      type: String,
      default: 'Dhyey Clinic & Nursing Home',
      trim: true,
    },
    clinicTagline: {
      type: String,
      default: 'Single Doctor Medical Suite',
      trim: true,
    },
    specialization: {
      type: String,
      default: 'FAMILY PHYSICIAN (B.H.M.S.)',
      trim: true,
    },
    degree: {
      type: String,
      default: 'B.H.M.S.',
      trim: true,
    },
    regNo: {
      type: String,
      default: 'G-9035',
      trim: true,
    },
    phone: {
      type: String,
      default: '98793 80508',
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
    },
    address: {
      type: String,
      default: 'Shop No. 1, Mahavir Heights, New Kosad Road, Amroli, Surat.',
      trim: true,
    },
    medicalStore: {
      type: String,
      default: 'Harsh Medical & General Stores',
      trim: true,
    },
    securityQuestion: {
      type: String,
      default: 'What is your Medical Council / Clinic Registration No?',
      trim: true,
    },
    securityAnswer: {
      type: String,
      default: 'G-9035',
      trim: true,
    },
    resetToken: {
      type: String,
      default: null,
    },
    resetTokenExpiry: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook: Hash password if modified and not already hashed
doctorSchema.pre('save', async function () {
  if (this.isModified('password') && this.password) {
    if (!this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }
});

// Compare password using bcrypt
doctorSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password || !enteredPassword) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Compare security answer (case-insensitive and trimmed)
doctorSchema.methods.matchSecurityAnswer = function (enteredAnswer) {
  if (!this.securityAnswer || !enteredAnswer) return false;
  return this.securityAnswer.trim().toLowerCase() === enteredAnswer.trim().toLowerCase();
};

const Doctor = mongoose.model('Doctor', doctorSchema);

export default Doctor;
