const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getFirestore } = require('../config/firebase');
const admin = require('firebase-admin');

const db = getFirestore();

/**
 * GET /api/marketplace
 * Get marketplace products feed
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 20, category, locality } = req.query;
    
    // Get user's locality if not provided
    let userLocality = locality;
    if (!userLocality) {
      const userDoc = await db.collection('users').doc(userId).get();
      userLocality = userDoc.data().location.locality;
    }
    
    let query = db.collection('marketplace')
      .where('location.locality', '==', userLocality)
      .where('status', '==', 'active')
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit));
    
    if (category) {
      query = query.where('category', '==', category);
    }
    
    const productsSnapshot = await query.get();
    const products = productsSnapshot.docs.map(doc => ({
      productId: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      data: products,
      total: products.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch marketplace products',
      error: error.message
    });
  }
});

/**
 * POST /api/marketplace
 * Create product listing
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.userId;
    const {
      title,
      description,
      category,
      condition,
      price,
      imageUrls,
      location,
      pickupDetails
    } = req.body;
    
    if (!title || !price || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, price, and category are required'
      });
    }
    
    const productId = uuidv4();
    
    const productData = {
      productId,
      sellerId: userId,
      title,
      description,
      category,
      condition: condition || 'good',
      price: parseFloat(price),
      imageUrls: imageUrls || [],
      location: location || {},
      pickupDetails: pickupDetails || {},
      engagement: {
        views: 0,
        saves: 0,
        inquiries: 0,
        ratings: 0,
        reviews: []
      },
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('marketplace').doc(productId).set(productData);
    
    // Emit real-time update
    if (req.app.io) {
      req.app.io.to(`marketplace:${location.locality}`).emit('new-product', productData);
    }
    
    res.status(201).json({
      success: true,
      message: 'Product listing created successfully',
      data: productData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create listing',
      error: error.message
    });
  }
});

/**
 * GET /api/marketplace/:productId
 * Get product details
 */
router.get('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    const productDoc = await db.collection('marketplace').doc(productId).get();
    
    if (!productDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Increment views
    await productDoc.ref.update({
      'engagement.views': admin.firestore.FieldValue.increment(1)
    });
    
    res.json({
      success: true,
      data: {
        productId: productDoc.id,
        ...productDoc.data()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message
    });
  }
});

/**
 * POST /api/marketplace/:productId/buy
 * Initiate purchase
 */
router.post('/:productId/buy', async (req, res) => {
  try {
    const userId = req.userId;
    const { productId } = req.params;
    const { pickupLocation, paymentMethod } = req.body;
    
    const productDoc = await db.collection('marketplace').doc(productId).get();
    
    if (!productDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    const productData = productDoc.data();
    
    if (productData.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Product is no longer available'
      });
    }
    
    // Create transaction
    const transactionId = uuidv4();
    const transaction = {
      transactionId,
      buyerId: userId,
      sellerId: productData.sellerId,
      itemId: productId,
      itemType: 'product',
      itemTitle: productData.title,
      amount: productData.price,
      currency: 'INR',
      paymentMethod: paymentMethod || 'upi',
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: new Date()
    };
    
    await db.collection('transactions').doc(transactionId).set(transaction);
    
    res.status(201).json({
      success: true,
      message: 'Purchase initiated. Please complete payment.',
      data: transaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to initiate purchase',
      error: error.message
    });
  }
});

module.exports = router;
