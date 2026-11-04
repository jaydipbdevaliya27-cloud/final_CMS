import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check active session on initial load (strictly in-memory, no localStorage)
  const checkAuth = async () => {
    try {
      setLoading(true);
      const res = await authAPI.getProfile();
      if (res.success && res.doctor) {
        setDoctor(res.doctor);
      } else {
        setDoctor(null);
      }
    } catch {
      setDoctor(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Doctor Login
  const login = async (username, password) => {
    const res = await authAPI.login({ username, password });
    if (res.success && res.doctor) {
      setDoctor(res.doctor);
      return res.doctor;
    }
    throw new Error(res.message || 'Login failed');
  };

  // Doctor Logout
  const logout = async () => {
    try {
      await authAPI.logout();
    } finally {
      setDoctor(null);
    }
  };

  // Update Clinic & Doctor Profile Info
  const updateProfile = async (profileData) => {
    const res = await authAPI.updateProfile(profileData);
    if (res.success && res.doctor) {
      setDoctor(res.doctor);
      return res.doctor;
    }
    throw new Error(res.message || 'Profile update failed');
  };

  // Change Doctor Credentials (Username & Password)
  const changeCredentials = async (credentialsData) => {
    const res = await authAPI.changeCredentials(credentialsData);
    if (res.success && res.doctor) {
      setDoctor(res.doctor);
      return res.doctor;
    }
    throw new Error(res.message || 'Failed to update credentials');
  };

  return (
    <AuthContext.Provider
      value={{
        doctor,
        isAuthenticated: !!doctor,
        loading,
        login,
        logout,
        checkAuth,
        updateProfile,
        changeCredentials,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
