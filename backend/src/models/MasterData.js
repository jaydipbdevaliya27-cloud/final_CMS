import mongoose from 'mongoose';

const masterDataSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
    },
    shortcut: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent exact duplicate entries under same category type
masterDataSchema.index({ type: 1, value: 1 }, { unique: true });

const MasterData = mongoose.model('MasterData', masterDataSchema);

export default MasterData;
