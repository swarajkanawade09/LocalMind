const express = require('express');
const router = express.Router();
const { getFirestore } = require('../config/firebase');

const db = getFirestore();

/**
 * GET /api/users/profile
 * Get current user profile
 */
router.get('/profile', async (req, res) => {
  try {
    const userId = req.userId;
    
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: userDoc.data()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
});

/**
 * PUT /api/users/profile
 * Update user profile
 */
router.put('/profile', async (req, res) => {
  try {
    const userId = req.userId;
    const { firstName, lastName, bio, profilePictureUrl, interests, language } = req.body;
    
    const usersRef = db.collection('users');
    
    const updateData = {};
    if (firstName) updateData['profile.firstName'] = firstName;
    if (lastName) updateData['profile.lastName'] = lastName;
    if (bio) updateData['profile.bio'] = bio;
    if (profilePictureUrl) updateData['profile.profilePictureUrl'] = profilePictureUrl;
    if (interests) updateData['preferences.interests'] = interests;
    if (language) updateData['preferences.language'] = language;
    
    updateData['updatedAt'] = new Date();
    
    await usersRef.doc(userId).update(updateData);
    
    const updatedDoc = await usersRef.doc(userId).get();
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedDoc.data()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
});

/**
 * GET /api/users/nearby
 * Get nearby users
 */
router.get('/nearby', async (req, res) => {
  try {
    const userId = req.userId;
    const { radius = 5 } = req.query; // radius in km
    
    // Get current user location
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const { latitude, longitude, locality } = userData.location;
    
    // Query users in same locality
    const nearbyUsers = await db.collection('users')
      .where('location.locality', '==', locality)
      .limit(20)
      .get();
    
    const users = nearbyUsers.docs
      .map(doc => doc.data())
      .filter(u => u.userId !== userId)
      .slice(0, 10);
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby users',
      error: error.message
    });
  }
});

/**
 * POST /api/users/follow
 * Follow a user
 */
router.post('/follow', async (req, res) => {
  try {
    const userId = req.userId;
    const { targetUserId } = req.body;
    
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Target user ID is required'
      });
    }
    
    const usersRef = db.collection('users');
    
    // Add to following list
    await usersRef.doc(userId).update({
      'socialStats.following': require('firebase-admin').firestore.FieldValue.increment(1)
    });
    
    // Add to followers list
    await usersRef.doc(targetUserId).update({
      'socialStats.followers': require('firebase-admin').firestore.FieldValue.increment(1)
    });
    
    res.json({
      success: true,
      message: 'User followed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to follow user',
      error: error.message
    });
  }
});

/**
 * GET /api/users/:userId
 * Get user details
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: userDoc.data()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
});

module.exports = router;
