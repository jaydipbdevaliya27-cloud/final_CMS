import mongoose from 'mongoose';

const familySchema = new mongoose.Schema(
  {
    familyId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    headName: {
      type: String,
      required: [true, 'Family head name is required'],
      trim: true,
    },
    headPatientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
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
    registrationDoneBy: {
      type: String,
      default: 'Self (Head of Family)',
    },
    membersCount: {
      type: Number,
      default: 1,
    },
    familyDue: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Family = mongoose.model('Family', familySchema);

export default Family;

