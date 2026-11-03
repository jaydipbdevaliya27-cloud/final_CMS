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

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || DEFAULT_MONGO_URI;
    const conn = await mongoose.connect(mongoUri);
    console.log(`[MongoDB Connected]: ${conn.connection.host} / ${conn.connection.name}`);
  } catch (error) {
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;

