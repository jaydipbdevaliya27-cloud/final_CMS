import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: 'Dr. Dhyey',
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
      default: 'Clinic Management System',
      trim: true,
    },
    specialization: {
      type: String,
      default: 'Consulting Physician',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Doctor = mongoose.model('Doctor', doctorSchema);

export default Doctor;
