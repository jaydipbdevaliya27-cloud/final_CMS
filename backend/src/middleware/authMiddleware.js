import jwt from 'jsonwebtoken';
import Doctor from '../models/Doctor.js';

export const protectDoctor = async (req, res, next) => {
  try {
    let token = req.cookies?.token;

    // Also support Authorization header (Bearer token)
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized access. No session token provided. Please log in.',
      });
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'super_secret_clinic_jwt_key_2026_secured'
    );

    // Fetch doctor from MongoDB
    const doctor = await Doctor.findById(decoded.id).select('-password');
    if (!doctor) {
      return res.status(401).json({
        success: false,
        message: 'Doctor account no longer exists or unauthorized.',
      });
    }

    req.doctor = doctor;
    next();
  } catch (error) {
    console.error('Auth verification error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session token. Please log in again.',
    });
  }
};

