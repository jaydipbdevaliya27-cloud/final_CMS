import mongoose from 'mongoose';

const specialFindingSchema = new mongoose.Schema(
  {
    key: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    notes: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const labReportSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      unique: true,
      index: true,
    },
    patientId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    familyId: {
      type: String,
      trim: true,
      default: '',
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    familyName: {
      type: String,
      trim: true,
      default: '',
    },
    labName: {
      type: String,
      default: 'Diagnostic Laboratory Name',
      trim: true,
    },
    doctorName: {
      type: String,
      default: 'Dr. Chirag Paghdal',
      trim: true,
    },
    caseNo: {
      type: String,
      default: '',
      trim: true,
    },
    entryDate: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
    },

    // 1. Routine Hematology (CBC) Parameters
    hematology: {
      hb: { type: String, default: '' },
      rbc: { type: String, default: '' },
      wbc: { type: String, default: '' },
      platelet: { type: String, default: '' },
      esr: { type: String, default: '' },
    },

    // 2. Blood Glucose & Renal Profile
    bloodGlucoseRenal: {
      rbs: { type: String, default: '' },
      fbs: { type: String, default: '' },
      ppbs: { type: String, default: '' },
      screatinin: { type: String, default: '' },
      vitb12: { type: String, default: '' },
    },

    // 3. Differential WBC Count Polymorphs
    differentialWbc: {
      bandCell: { type: String, default: '' },
      neutrophils: { type: String, default: '' },
      lymphocytes: { type: String, default: '' },
      eosinophils: { type: String, default: '' },
      monocytes: { type: String, default: '' },
      basophils: { type: String, default: '' },
      parasites: { type: String, default: '' },
    },

    // 4. Thyroid Function Test
    thyroid: {
      t3: { type: String, default: '' },
      t4: { type: String, default: '' },
      tsh: { type: String, default: '' },
    },

    // 5. Other Reports (Radiology, USG, Stool, Special Free-Text Findings)
    specialFindings: {
      type: [specialFindingSchema],
      default: [],
    },

    summary: {
      type: String,
      default: '',
      trim: true,
    },

    visitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Visit',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const LabReport = mongoose.model('LabReport', labReportSchema);

export default LabReport;

