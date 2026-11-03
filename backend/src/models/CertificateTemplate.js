import mongoose from 'mongoose';

const certificateTemplateSchema = new mongoose.Schema(
  {
    templateKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: 'General',
    },
    defaultBodyText: {
      type: String,
      required: true,
    },
    isCustom: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const CertificateTemplate = mongoose.model('CertificateTemplate', certificateTemplateSchema);

export default CertificateTemplate;

