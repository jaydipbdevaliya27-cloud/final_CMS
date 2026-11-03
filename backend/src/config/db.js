import dns from 'dns';
import mongoose from 'mongoose';

// Ensure reliable DNS resolution for mongodb+srv connections across environments
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore in environments where setServers is restricted
}

const DEFAULT_MONGO_URI =
  'mongodb+srv://jaydipbdevaliya27_db_user:jaydipbdevaliya27_db_user@cluster0.hlg21zw.mongodb.net/clinic_management_db?retryWrites=true&w=majority';

// Ensure proper database name (clinic_management_db) is always targeted
const sanitizeMongoUri = (raw) => {
  if (!raw || !raw.trim()) return DEFAULT_MONGO_URI;
  let uri = raw.trim();

  // If URI ends with mongodb.net/ or has no db name before query string
  if (/mongodb\.net\/?(\?.*)?$/i.test(uri)) {
    uri = uri.replace(/mongodb\.net\/?(\?.*)?$/i, (match, query) => {
      return `mongodb.net/clinic_management_db${query || '?retryWrites=true&w=majority'}`;
    });
  } else if (/mongodb\.net\/test(\?.*)?$/i.test(uri)) {
    // If set to /test, route to the official clinic_management_db
    uri = uri.replace(/mongodb\.net\/test(\?.*)?$/i, (match, query) => {
      return `mongodb.net/clinic_management_db${query || '?retryWrites=true&w=majority'}`;
    });
  }

  return uri;
};

// Automatically cleanup stale indexes from earlier schema iterations if present
const cleanupStaleIndexes = async (db) => {
  const staleIndexes = [
    { coll: 'patients', index: 'clinicId_1_patientCode_1' },
    { coll: 'patients', index: 'clinicId_1' },
    { coll: 'families', index: 'clinicId_1_familyCode_1' },
    { coll: 'families', index: 'clinicId_1' },
    { coll: 'counters', index: 'clinicId_1' },
    { coll: 'visits', index: 'clinicId_1' },
    { coll: 'dietaries', index: 'clinicId_1_code_1' },
    { coll: 'dietaries', index: 'clinicId_1' },
  ];

  for (const item of staleIndexes) {
    try {
      await db.collection(item.coll).dropIndex(item.index);
      console.log(`[Stale Index Removed]: ${item.coll}.${item.index}`);
    } catch {
      // Index already absent, normal behavior
    }
  }
};

const connectDB = async () => {
  try {
    const mongoUri = sanitizeMongoUri(process.env.MONGODB_URI);
    const conn = await mongoose.connect(mongoUri);
    console.log(`[MongoDB Connected]: ${conn.connection.host} / ${conn.connection.name}`);

    // Clean any residual stale indexes on connected database
    await cleanupStaleIndexes(conn.connection.db);
  } catch (error) {
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;

