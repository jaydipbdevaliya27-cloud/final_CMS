import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      unique: true,
      index: true,
    },
    familyId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
    },
    age: {
      type: String, // Accepts e.g. "35", "6M", "2Y"
      trim: true,
      default: '',
    },
    gender: {
      type: String,
      default: 'Not Specified',
    },
    bloodGroup: {
      type: String,
      trim: true,
      default: '',
    },
    allergies: {
      type: [String],
      default: [],
    },
    society: {
      type: String,
      trim: true,
      default: '',
    },
    area: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    relation: {
      type: String,
      default: 'Self',
      trim: true,
    },
    isHead: {
      type: Boolean,
      default: false,
    },
    registrationDoneBy: {
      type: String,
      default: 'Family Member',
    },
    totalDue: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Search & performance indexes
patientSchema.index({ name: 1 });
patientSchema.index({ phone: 1 });
patientSchema.index({ createdAt: -1 });

const Patient = mongoose.model('Patient', patientSchema);

export default Patient;
