import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema(
  {
    certificateId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    patientId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    age: {
      type: String,
      default: '',
    },
    gender: {
      type: String,
      default: 'Male',
    },
    templateId: {
      type: String,
      default: 'fitness',
    },
    templateName: {
      type: String,
      default: 'Medical Fitness Certificate',
    },
    medicalDiagnosis: {
      type: String,
      required: true,
      trim: true,
    },
    fromDate: {
      type: String,
      required: true,
    },
    toDate: {
      type: String,
      required: true,
    },
    restDays: {
      type: Number,
      default: 1,
    },
    issuePlace: {
      type: String,
      default: 'Ahmedabad',
    },
    bodyText: {
      type: String,
      required: true,
    },
    clinicName: {
      type: String,
      default: 'Dhyey Main Clinic',
    },
    clinicAddress: {
      type: String,
      default: 'Shop No. 1, Mahavir Heights, New Kosad Road, Amroli, Surat',
    },
    doctorName: {
      type: String,
      default: 'Dr. Dhyey Patel',
    },
    doctorRegNo: {
      type: String,
      default: 'G-14285',
    },
    doctorQualifications: {
      type: String,
      default: 'M.B.B.S., Consulting Physician',
    },
    digitalSignature: {
      type: String,
      default: '',
    },
    issueDate: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
    },
    status: {
      type: String,
      enum: ['Issued', 'Cancelled', 'Expired'],
      default: 'Issued',
    },
    isVerifiable: {
      type: Boolean,
      default: true,
    },
    verificationCode: {
      type: String,
      default: () => Math.random().toString(36).substring(2, 10).toUpperCase(),
    },
  },
  {
    timestamps: true,
  }
);

const Certificate = mongoose.model('Certificate', certificateSchema);

export default Certificate;
