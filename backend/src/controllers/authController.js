import Doctor from '../models/Doctor.js';
import { generateTokenAndSetCookie } from '../utils/generateToken.js';

// Fixed credentials
const FIXED_CREDENTIALS = {
  username: 'dhyey',
  password: '123',
};

// @desc    Doctor Login with Fixed Credentials
// @route   POST /api/auth/login
// @access  Public
export const loginDoctor = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both username and password.',
      });
    }

    // Verify against fixed credentials
    if (username.trim() !== FIXED_CREDENTIALS.username || password !== FIXED_CREDENTIALS.password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.',
      });
    }

    // Ensure doctor profile exists in MongoDB
    let doctor = await Doctor.findOne({ username: FIXED_CREDENTIALS.username });
    if (!doctor) {
      doctor = await Doctor.create({
        name: 'Dr. Dhyey',
        username: FIXED_CREDENTIALS.username,
        clinicName: 'Clinic Management System',
        specialization: 'Consulting Physician',
      });
    }

    // Generate JWT and set HttpOnly cookie
    generateTokenAndSetCookie(res, doctor._id);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      doctor: {
        id: doctor._id,
        name: doctor.name,
        username: doctor.username,
        clinicName: doctor.clinicName,
        specialization: doctor.specialization,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message,
    });
  }
};

// @desc    Get Current Doctor Profile
// @route   GET /api/auth/me
// @access  Private
export const getDoctorProfile = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      doctor: req.doctor,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
      error: error.message,
    });
  }
};

// @desc    Doctor Logout
// @route   POST /api/auth/logout
// @access  Private
export const logoutDoctor = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
};
