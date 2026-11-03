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

    // Ensure doctor profile exists in MongoDB with official clinic letterpad profile
    let doctor = await Doctor.findOne({ username: FIXED_CREDENTIALS.username });
    if (!doctor) {
      doctor = await Doctor.create({
        name: 'Dr. Chirag Paghdal',
        username: FIXED_CREDENTIALS.username,
        clinicName: 'Dhyey Clinic & Nursing Home',
        specialization: 'FAMILY PHYSICIAN (B.H.M.S.)',
        degree: 'B.H.M.S.',
        regNo: 'G-9035',
        phone: '98793 80508',
        address: 'Shop No. 1, Mahavir Heights, New Kosad Road, Amroli, Surat.',
        medicalStore: 'Harsh Medical & General Stores',
      });
    } else {
      // Keep profile aligned with official clinic identity
      let needSave = false;
      if (doctor.name === 'Dr. Dhyey' || !doctor.name) {
        doctor.name = 'Dr. Chirag Paghdal';
        needSave = true;
      }
      if (doctor.clinicName === 'Clinic Management System' || !doctor.clinicName) {
        doctor.clinicName = 'Dhyey Clinic & Nursing Home';
        needSave = true;
      }
      if (!doctor.regNo) {
        doctor.regNo = 'G-9035';
        needSave = true;
      }
      if (!doctor.phone) {
        doctor.phone = '98793 80508';
        needSave = true;
      }
      if (!doctor.address) {
        doctor.address = 'Shop No. 1, Mahavir Heights, New Kosad Road, Amroli, Surat.';
        needSave = true;
      }
      if (!doctor.medicalStore) {
        doctor.medicalStore = 'Harsh Medical & General Stores';
        needSave = true;
      }
      if (needSave) {
        await doctor.save();
      }
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
        degree: doctor.degree || 'B.H.M.S.',
        regNo: doctor.regNo || 'G-9035',
        phone: doctor.phone || '98793 80508',
        address: doctor.address || 'Shop No. 1, Mahavir Heights, New Kosad Road, Amroli, Surat.',
        medicalStore: doctor.medicalStore || 'Harsh Medical & General Stores',
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
