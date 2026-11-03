import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import familyRoutes from './routes/familyRoutes.js';
import masterDataRoutes from './routes/masterDataRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import visitRoutes from './routes/visitRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import certificateRoutes from './routes/certificateRoutes.js';
import labReportRoutes from './routes/labReportRoutes.js';
import universalSearchRoutes from './routes/universalSearchRoutes.js';
import { cleanupCompositeMasterData } from './controllers/masterDataController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from backend root directory
dotenv.config({ path: path.join(__dirname, '../.env') });

// Connect Database
connectDB().then(() => {
  cleanupCompositeMasterData();
});

const app = express();

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(null, true); // Dev-friendly fallback
      }
    },
    credentials: true, // Allow cookies to be sent back and forth
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/families', familyRoutes);
app.use('/api/master-data', masterDataRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/lab-reports', labReportRoutes);
app.use('/api/universal-search', universalSearchRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Clinic Management System API',
  });
});

// Serve static frontend assets if built (Production or Single Web Service on Render)
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Fallback 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.originalUrl} not found`,
  });
});

// General 404 fallback
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.originalUrl} not found`,
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`[CMS Server] Running on http://localhost:${PORT}`);
});
