const express = require('express');
const router = express.Router();
const { getFirestore } = require('../config/firebase');

const db = getFirestore();

/**
 * GET /api/businesses
 * Get nearby businesses
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;
    const { category, locality, limit = 20 } = req.query;
    
    // Get user's locality if not provided
    let userLocality = locality;
    if (!userLocality) {
      const userDoc = await db.collection('users').doc(userId).get();
      userLocality = userDoc.data().location.locality;
    }
    
    let query = db.collection('businesses')
      .where('location.locality', '==', userLocality)
      .where('verified', '==', true)
      .limit(parseInt(limit));
    
    if (category) {
      query = query.where('category', '==', category);
    }
    
    const businessesSnapshot = await query.get();
    const businesses = businessesSnapshot.docs.map(doc => ({
      businessId: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      data: businesses,
      total: businesses.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch businesses',
      error: error.message
    });
  }
});

/**
 * POST /api/businesses
 * Create business profile
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.userId;
    const {
      name,
      category,
      description,
      location,
      contact,
      hours
    } = req.body;
    
    if (!name || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name and category are required'
      });
    }
    
    const { v4: uuidv4 } = require('uuid');
    const businessId = uuidv4();
    
    const businessData = {
      businessId,
      ownerId: userId,
      name,
      category,
      description,
      location: location || {},
      contact: contact || {},
      hours: hours || {},
      verified: false,
      verificationBadge: 'unverified',
      followers: 0,
      reviews: 0,
      averageRating: 0,
      topReviews: [],
      subscriptionTier: 'free',
      totalPosts: 0,
      totalPromotions: 0,
      analytics: {
        monthlyViews: 0,
        monthlyClicks: 0,
        monthlyMessages: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('businesses').doc(businessId).set(businessData);
    
    res.status(201).json({
      success: true,
      message: 'Business profile created. Awaiting verification.',
      data: businessData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create business profile',
      error: error.message
    });
  }
});

/**
 * GET /api/businesses/:businessId
 * Get business details
 */
router.get('/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    
    const businessDoc = await db.collection('businesses').doc(businessId).get();
    
    if (!businessDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        businessId: businessDoc.id,
        ...businessDoc.data()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch business',
      error: error.message
    });
  }
});

module.exports = router;
