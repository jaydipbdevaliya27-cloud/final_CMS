import mongoose from 'mongoose';

const cutSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
      index: true,
    },
    centerName: {
      type: String,
      required: [true, 'Diagnostic / Center / Source name is required'],
      trim: true,
      index: true,
    },
    patientName: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      required: [true, 'Cut category is required'],
      trim: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Cut commission amount is required'],
      min: [0, 'Amount must be positive'],
    },
    status: {
      type: String,
      enum: ['Unpaid', 'Paid'],
      default: 'Unpaid',
      index: true,
    },
    paymentMode: {
      type: String,
      default: 'Cash',
      trim: true,
    },
    reference: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

cutSchema.index({ date: -1, createdAt: -1 });

const Cut = mongoose.model('Cut', cutSchema);

export default Cut;
