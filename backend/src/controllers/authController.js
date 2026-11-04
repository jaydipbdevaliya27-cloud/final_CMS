import crypto from 'crypto';
import Doctor from '../models/Doctor.js';
import { generateTokenAndSetCookie } from '../utils/generateToken.js';

// Helper to sanitize doctor object (remove password, tokens)
const sanitizeDoctor = (doctor) => ({
  id: doctor._id,
  _id: doctor._id,
  name: doctor.name || 'Dr. Chirag Paghdal',
  username: doctor.username || 'dhyey',
  clinicName: doctor.clinicName || 'Dhyey Clinic & Nursing Home',
  clinicTagline: doctor.clinicTagline || 'Single Doctor Medical Suite',
  specialization: doctor.specialization || 'FAMILY PHYSICIAN (B.H.M.S.)',
  degree: doctor.degree || 'B.H.M.S.',
  regNo: doctor.regNo || 'G-9035',
  phone: doctor.phone || '98793 80508',
  email: doctor.email || '',
  address: doctor.address || 'Shop No. 1, Mahavir Heights, New Kosad Road, Amroli, Surat.',
  medicalStore: doctor.medicalStore || 'Harsh Medical & General Stores',
  securityQuestion: doctor.securityQuestion || 'What is your Medical Council / Clinic Registration No?',
});

// Ensure doctor exists in MongoDB and has a secure hashed password
export const ensureDoctorInitialized = async () => {
  let doctor = await Doctor.findOne();
  if (!doctor) {
    doctor = await Doctor.create({
      name: 'Dr. Chirag Paghdal',
      username: 'dhyey',
      password: 'Doctor@123',
      clinicName: 'Dhyey Clinic & Nursing Home',
      clinicTagline: 'Single Doctor Medical Suite',
      specialization: 'FAMILY PHYSICIAN (B.H.M.S.)',
      degree: 'B.H.M.S.',
      regNo: 'G-9035',
      phone: '98793 80508',
      email: '',
      address: 'Shop No. 1, Mahavir Heights, New Kosad Road, Amroli, Surat.',
      medicalStore: 'Harsh Medical & General Stores',
      securityQuestion: 'What is your Medical Council / Clinic Registration No?',
      securityAnswer: 'G-9035',
    });
  } else if (!doctor.password) {
    // Migrate existing unhashed doctor record to secure hashed password
    doctor.password = 'Doctor@123';
    if (!doctor.securityQuestion) doctor.securityQuestion = 'What is your Medical Council / Clinic Registration No?';
    if (!doctor.securityAnswer) doctor.securityAnswer = 'G-9035';
    if (!doctor.clinicTagline) doctor.clinicTagline = 'Single Doctor Medical Suite';
    await doctor.save();
  }
  return doctor;
};

// @desc    Doctor Login with DB credentials & bcrypt verification
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

    await ensureDoctorInitialized();

    const cleanUsername = username.trim().toLowerCase();
    const doctor = await Doctor.findOne({ username: cleanUsername });

    if (!doctor) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.',
      });
    }

    const isMatch = await doctor.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.',
      });
    }

    // Generate JWT and set HttpOnly cookie
    const token = generateTokenAndSetCookie(res, doctor._id);

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token,
      doctor: sanitizeDoctor(doctor),
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
      doctor: sanitizeDoctor(req.doctor),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
      error: error.message,
    });
  }
};

// @desc    Update Doctor Profile & Clinic Details (No credentials change)
// @route   PUT /api/auth/profile
// @access  Private
export const updateDoctorProfile = async (req, res) => {
  try {
    const doctor = req.doctor;
    const {
      name,
      clinicName,
      clinicTagline,
      specialization,
      degree,
      regNo,
      phone,
      email,
      address,
      medicalStore,
      securityQuestion,
      securityAnswer,
    } = req.body;

    if (name !== undefined) doctor.name = name.trim();
    if (clinicName !== undefined) doctor.clinicName = clinicName.trim();
    if (clinicTagline !== undefined) doctor.clinicTagline = clinicTagline.trim();
    if (specialization !== undefined) doctor.specialization = specialization.trim();
    if (degree !== undefined) doctor.degree = degree.trim();
    if (regNo !== undefined) doctor.regNo = regNo.trim();
    if (phone !== undefined) doctor.phone = phone.trim();
    if (email !== undefined) doctor.email = email.trim();
    if (address !== undefined) doctor.address = address.trim();
    if (medicalStore !== undefined) doctor.medicalStore = medicalStore.trim();
    if (securityQuestion !== undefined && securityQuestion.trim()) {
      doctor.securityQuestion = securityQuestion.trim();
    }
    if (securityAnswer !== undefined && securityAnswer.trim()) {
      doctor.securityAnswer = securityAnswer.trim();
    }

    await doctor.save();

    return res.status(200).json({
      success: true,
      message: 'Clinic details and doctor profile updated successfully.',
      doctor: sanitizeDoctor(doctor),
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update doctor profile',
      error: error.message,
    });
  }
};

// @desc    Change Username and/or Password (Requires Current Password verification)
// @route   PUT /api/auth/change-credentials
// @access  Private
export const changeCredentials = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.doctor._id);
    const { currentPassword, newUsername, newPassword } = req.body;

    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is required to update credentials.',
      });
    }

    // Strictly authenticate current credentials before changing
    const isCurrentValid = await doctor.matchPassword(currentPassword);
    if (!isCurrentValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect. Authentication failed.',
      });
    }

    // Handle Username change if provided
    if (newUsername && newUsername.trim()) {
      const cleanNewUser = newUsername.trim().toLowerCase();
      if (cleanNewUser.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Username must be at least 3 characters long.',
        });
      }

      // Check if username taken by another account
      const existing = await Doctor.findOne({
        username: cleanNewUser,
        _id: { $ne: doctor._id },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'This username is already taken. Please choose another.',
        });
      }
      doctor.username = cleanNewUser;
    }

    // Handle Password change if provided
    if (newPassword && newPassword.trim()) {
      if (newPassword.trim().length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long.',
        });
      }
      doctor.password = newPassword.trim();
    }

    await doctor.save();

    // Re-issue JWT session token
    const token = generateTokenAndSetCookie(res, doctor._id);

    return res.status(200).json({
      success: true,
      message: 'Credentials updated successfully. Your new credentials are now active.',
      token,
      doctor: sanitizeDoctor(doctor),
    });
  } catch (error) {
    console.error('Change credentials error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update credentials',
      error: error.message,
    });
  }
};

// @desc    Get Security Question for Username (Forgot Password Step 1)
// @route   GET /api/auth/forgot-password/question/:username
// @access  Public
export const getSecurityQuestion = async (req, res) => {
  try {
    const { username } = req.params;
    if (!username || !username.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a username.',
      });
    }

    await ensureDoctorInitialized();

    const cleanUsername = username.trim().toLowerCase();
    const doctor = await Doctor.findOne({ username: cleanUsername });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'No registered doctor account found with this username.',
      });
    }

    return res.status(200).json({
      success: true,
      username: doctor.username,
      securityQuestion: doctor.securityQuestion || 'What is your Medical Council / Clinic Registration No?',
    });
  } catch (error) {
    console.error('Forgot password question error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve recovery question',
      error: error.message,
    });
  }
};

// @desc    Verify Security Answer (Forgot Password Step 2)
// @route   POST /api/auth/forgot-password/verify
// @access  Public
export const verifySecurityAnswer = async (req, res) => {
  try {
    const { username, securityAnswer } = req.body;

    if (!username || !securityAnswer) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and your answer to the security question.',
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    const doctor = await Doctor.findOne({ username: cleanUsername });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Account not found.',
      });
    }

    const isAnswerMatch = doctor.matchSecurityAnswer(securityAnswer);
    if (!isAnswerMatch) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect answer to the security question. Verification failed.',
      });
    }

    // Generate secure 15-minute reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    doctor.resetToken = resetToken;
    doctor.resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await doctor.save();

    return res.status(200).json({
      success: true,
      message: 'Security answer verified successfully. You may now reset your password.',
      resetToken,
    });
  } catch (error) {
    console.error('Verify security answer error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify security answer',
      error: error.message,
    });
  }
};

// @desc    Reset Password with Verified Reset Token (Forgot Password Step 3)
// @route   POST /api/auth/forgot-password/reset
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { username, resetToken, newPassword } = req.body;

    if (!username || !resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Missing username, reset token, or new password.',
      });
    }

    if (newPassword.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.',
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    const doctor = await Doctor.findOne({
      username: cleanUsername,
      resetToken,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!doctor) {
      return res.status(400).json({
        success: false,
        message: 'Password reset session has expired or is invalid. Please start again.',
      });
    }

    // Set new password (pre-save hook will hash it)
    doctor.password = newPassword.trim();
    doctor.resetToken = null;
    doctor.resetTokenExpiry = null;
    await doctor.save();

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully! You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error.message,
    });
  }
};

// @desc    Doctor Logout
// @route   POST /api/auth/logout
// @access  Private
export const logoutDoctor = (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isCrossOrigin = process.env.CROSS_ORIGIN === 'true';

  res.clearCookie('token', {
    httpOnly: true,
    sameSite: isCrossOrigin ? 'none' : 'lax',
    secure: isProduction,
  });

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
};
