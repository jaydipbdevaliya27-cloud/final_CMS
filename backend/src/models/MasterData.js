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

export const MASTER_COLLECTION_MAP = {
  medicine: 'master_medicines',
  complaint: 'master_complaints',
  area: 'master_areas',
  ipd: 'master_ipds',
  investigation: 'master_investigations',
  allergy: 'master_allergies',
  sos: 'master_sos',
  dietary: 'master_dietaries',
  lab_name: 'master_lab_names',
  cut_company: 'master_cut_companies',
  expense_company: 'master_expense_companies',
  expense_category: 'master_expense_categories',
  navigation: 'master_navigations',
};

const categorySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      trim: true,
      default: '',
    },
    value: {
      type: String,
      required: true,
      trim: true,
      unique: true,
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

const modelCache = {};

export const getMasterModel = (type) => {
  const cleanType = String(type || '').trim().toLowerCase();
  const collectionName = MASTER_COLLECTION_MAP[cleanType];
  if (!collectionName) return MasterData;

  if (!modelCache[collectionName]) {
    const modelName = `Master_${cleanType}`;
    modelCache[collectionName] =
      mongoose.models[modelName] ||
      mongoose.model(modelName, categorySchema, collectionName);
  }
  return modelCache[collectionName];
};

export const getAllMasterModels = () => {
  return Object.keys(MASTER_COLLECTION_MAP).map((t) => ({
    type: t,
    model: getMasterModel(t),
  }));
};

export default MasterData;
