import mongoose from 'mongoose';

const treatmentItemSchema = new mongoose.Schema(
  {
    item: { type: String, trim: true, default: '' },
    qty: { type: String, trim: true, default: '1' },
  },
  { _id: false }
);

const prescriptionItemSchema = new mongoose.Schema(
  {
    medicine: { type: String, trim: true, default: '' },
    qty: { type: String, trim: true, default: '' },
    morning: { type: String, trim: true, default: '1' },
    noon: { type: String, trim: true, default: '0' },
    evening: { type: String, trim: true, default: '1' },
    night: { type: String, trim: true, default: '0' },
    timing: { type: String, default: 'AF' },
    sosInstruction: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const investigationItemSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    reportType: { type: String, trim: true, default: '' },
    labName: { type: String, trim: true, default: 'CARE' },
  },
  { _id: false }
);

const visitSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    familyId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    visitDate: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
    },
    bp: {
      type: String,
      trim: true,
      default: '',
    },
    sugar: {
      type: String,
      trim: true,
      default: '',
    },
    other: {
      type: String,
      trim: true,
      default: '',
    },
    reference: {
      type: String,
      trim: true,
      default: '',
    },
    investigation: {
      type: String,
      trim: true,
      default: '',
    },
    investigationList: {
      type: [investigationItemSchema],
      default: [],
    },
    complaint: {
      type: String,
      trim: true,
      default: '',
    },
    complaintList: {
      type: [String],
      default: [],
    },
    treatments: {
      type: [treatmentItemSchema],
      default: [],
    },
    prescriptions: {
      type: [prescriptionItemSchema],
      default: [],
    },
    dietary: {
      type: String,
      trim: true,
      default: '',
    },
    ipdDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: [],
    },
    allergies: {
      type: [String],
      default: [],
    },
    charge: {
      type: Number,
      default: 0,
    },
    received: {
      type: Number,
      default: 0,
    },
    due: {
      type: Number,
      default: 0,
    },
    labReport: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    labReportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LabReport',
      default: null,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Performance indexes for rapid search, sort, and history loading
visitSchema.index({ createdAt: -1 });
visitSchema.index({ updatedAt: -1 });
visitSchema.index({ visitDate: -1, createdAt: -1 });
visitSchema.index({ patientName: 1 });
visitSchema.index({ patientId: 1, createdAt: -1 });

const Visit = mongoose.model('Visit', visitSchema);

export default Visit;

