import mongoose from 'mongoose';

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
    },
    clinicName: {
      type: String,
      default: 'Dhyey Clinic & Nursing Home',
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
  },
  {
    timestamps: true,
  }
);

const Doctor = mongoose.model('Doctor', doctorSchema);

export default Doctor;
