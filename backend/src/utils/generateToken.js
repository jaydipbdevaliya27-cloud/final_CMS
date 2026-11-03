import jwt from 'jsonwebtoken';

export const generateTokenAndSetCookie = (res, doctorId) => {
  const token = jwt.sign(
    { id: doctorId },
    process.env.JWT_SECRET || 'super_secret_clinic_jwt_key_2026_secured',
    {
      expiresIn: '7d',
    }
  );

  const isProduction = process.env.NODE_ENV === 'production';
  const isCrossOrigin = process.env.CROSS_ORIGIN === 'true';

  res.cookie('token', token, {
    httpOnly: true, // Prevents XSS attacks
    secure: isProduction, // Uses HTTPS in production
    sameSite: isCrossOrigin ? 'none' : 'lax', // 'none' for cross-domain cookies on HTTPS, 'lax' for single-domain
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return token;
};

