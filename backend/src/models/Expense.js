import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Expense category is required'],
      trim: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Expense amount is required'],
      min: [0, 'Amount must be positive'],
    },
    paymentMode: {
      type: String,
      default: 'Cash',
      trim: true,
    },
    paidTo: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

expenseSchema.index({ date: -1, createdAt: -1 });

const Expense = mongoose.model('Expense', expenseSchema);

export default Expense;

