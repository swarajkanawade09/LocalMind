const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getFirestore, getAuth } = require('../config/firebase');
const twilio = require('twilio');

const db = getFirestore();

// Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate JWT
const generateToken = (userId, role = 'user') => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );
};

/**
 * POST /api/auth/send-otp
 * Send OTP to user's phone number
 */
router.post('/send-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }
    
    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    // Store OTP in Firestore temporarily
    const otpRef = db.collection('otps').doc(phoneNumber);
    await otpRef.set({
      otp: await bcrypt.hash(otp, 10),
      createdAt: new Date(),
      expiresAt: new Date(otpExpiry),
      attempts: 0
    });
    
    // Send OTP via Twilio (in production)
    if (process.env.NODE_ENV === 'production') {
      await twilioClient.messages.create({
        body: `Your LocalMind verification code is: ${otp}. Valid for 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });
    } else {
      console.log(`🔐 OTP for ${phoneNumber}: ${otp}`);
    }
    
    res.json({
      success: true,
      message: 'OTP sent successfully',
      expiresIn: 600 // 10 minutes
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error: error.message
    });
  }
});

/**
 * POST /api/auth/verify-otp
 * Verify OTP and create/login user
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otp, firstName, lastName, locality } = req.body;
    
    if (!phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required'
      });
    }
    
    // Get OTP from Firestore
    const otpRef = db.collection('otps').doc(phoneNumber);
    const otpDoc = await otpRef.get();
    
    if (!otpDoc.exists) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found or expired'
      });
    }
    
    const otpData = otpDoc.data();
    
    // Check expiry
    if (new Date() > otpData.expiresAt.toDate()) {
      await otpRef.delete();
      return res.status(400).json({
        success: false,
        message: 'OTP has expired'
      });
    }
    
    // Check attempts
    if (otpData.attempts >= 3) {
      await otpRef.delete();
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.'
      });
    }
    
    // Verify OTP
    const isValidOTP = await bcrypt.compare(otp, otpData.otp);
    
    if (!isValidOTP) {
      await otpRef.update({
        attempts: otpData.attempts + 1
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }
    
    // Delete used OTP
    await otpRef.delete();
    
    // Check if user exists
    const usersRef = db.collection('users');
    const userQuery = await usersRef.where('phone', '==', phoneNumber).limit(1).get();
    
    let userId, isNewUser = false;
    
    if (userQuery.empty) {
      // Create new user
      isNewUser = true;
      userId = uuidv4();
      
      await usersRef.doc(userId).set({
        userId,
        phone: phoneNumber,
        profile: {
          firstName: firstName || '',
          lastName: lastName || '',
          displayName: `${firstName || ''} ${lastName || ''}`.trim(),
          profilePictureUrl: '',
          bio: ''
        },
        location: {
          latitude: 0,
          longitude: 0,
          locality: locality || 'Unknown',
          city: '',
          state: '',
          pincode: ''
        },
        verification: {
          isPhoneVerified: true,
          isEmailVerified: false,
          isBuildingVerified: false,
          verifiedBadge: false
        },
        preferences: {
          language: 'en',
          interests: [],
          notificationPreferences: {
            pushNotifications: true,
            emailNotifications: false,
            nearbyActivityRadius: 5
          },
          privacySettings: {
            showLocation: true,
            showProfile: true,
            allowMessages: true
          }
        },
        socialStats: {
          totalPosts: 0,
          followers: 0,
          following: 0,
          reputation: 0,
          blockedUsers: []
        },
        accountStatus: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: new Date()
      });
    } else {
      userId = userQuery.docs[0].id;
      // Update last login
      await usersRef.doc(userId).update({
        lastLoginAt: new Date()
      });
    }
    
    // Generate JWT token
    const token = generateToken(userId, 'user');
    
    // Get user data
    const userDoc = await usersRef.doc(userId).get();
    const userData = userDoc.data();
    
    res.json({
      success: true,
      message: isNewUser ? 'Account created successfully' : 'Logged in successfully',
      data: {
        userId,
        token,
        isNewUser,
        user: {
          ...userData,
          phone: phoneNumber
        }
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP',
      error: error.message
    });
  }
});

/**
 * POST /api/auth/refresh-token
 * Refresh JWT token
 */
router.post('/refresh-token', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    // Generate new token
    const token = generateToken(userId, 'user');
    
    res.json({
      success: true,
      data: { token }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to refresh token',
      error: error.message
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', (req, res) => {
  // Token is invalidated on client side
  // No server-side session to invalidate
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;
