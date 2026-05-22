const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getFirestore } = require('../config/firebase');

const db = getFirestore();

/**
 * GET /api/communities
 * Get list of communities
 */
router.get('/', async (req, res) => {
  try {
    const { type, limit = 20 } = req.query;
    
    let query = db.collection('communities').limit(parseInt(limit));
    
    if (type) {
      query = query.where('type', '==', type);
    }
    
    const communitiesSnapshot = await query.get();
    const communities = communitiesSnapshot.docs.map(doc => ({
      communityId: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      data: communities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch communities',
      error: error.message
    });
  }
});

/**
 * POST /api/communities
 * Create new community
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.userId;
    const {
      name,
      description,
      type,
      location,
      privacy = 'public',
      rules
    } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Name and type are required'
      });
    }
    
    const communityId = uuidv4();
    const communityData = {
      communityId,
      name,
      description,
      type,
      location: location || {},
      totalMembers: 1,
      verified: false,
      privacy,
      approvalRequired: privacy === 'private',
      admins: [userId],
      moderators: [],
      rules: rules || [],
      totalPosts: 0,
      totalPolls: 0,
      totalDiscussions: 0,
      pinnedPosts: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('communities').doc(communityId).set(communityData);
    
    // Add creator as member
    await db.collection('communities')
      .doc(communityId)
      .collection('members')
      .doc(userId)
      .set({
        userId,
        role: 'admin',
        joinedAt: new Date()
      });
    
    res.status(201).json({
      success: true,
      message: 'Community created successfully',
      data: communityData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create community',
      error: error.message
    });
  }
});

/**
 * GET /api/communities/:communityId
 * Get community details
 */
router.get('/:communityId', async (req, res) => {
  try {
    const { communityId } = req.params;
    
    const communityDoc = await db.collection('communities').doc(communityId).get();
    
    if (!communityDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Community not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        communityId: communityDoc.id,
        ...communityDoc.data()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch community',
      error: error.message
    });
  }
});

/**
 * POST /api/communities/:communityId/join
 * Join a community
 */
router.post('/:communityId/join', async (req, res) => {
  try {
    const userId = req.userId;
    const { communityId } = req.params;
    const admin = require('firebase-admin');
    
    const communityRef = db.collection('communities').doc(communityId);
    const communityDoc = await communityRef.get();
    
    if (!communityDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Community not found'
      });
    }
    
    // Add user as member
    await communityRef
      .collection('members')
      .doc(userId)
      .set({
        userId,
        role: 'member',
        joinedAt: new Date()
      });
    
    // Increment member count
    await communityRef.update({
      totalMembers: admin.firestore.FieldValue.increment(1)
    });
    
    res.json({
      success: true,
      message: 'Joined community successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to join community',
      error: error.message
    });
  }
});

/**
 * GET /api/communities/:communityId/posts
 * Get community posts
 */
router.get('/:communityId/posts', async (req, res) => {
  try {
    const { communityId } = req.params;
    const { limit = 20 } = req.query;
    
    const postsSnapshot = await db.collection('posts')
      .where('visibility.communityId', '==', communityId)
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit))
      .get();
    
    const posts = postsSnapshot.docs.map(doc => ({
      postId: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch community posts',
      error: error.message
    });
  }
});

module.exports = router;
