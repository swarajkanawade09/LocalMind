const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { getFirestore } = require('../config/firebase');
const admin = require('firebase-admin');

const db = getFirestore();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * POST /api/payments/create-order
 * Create Razorpay payment order
 */
router.post('/create-order', async (req, res) => {
  try {
    const userId = req.userId;
    const { amount, currency = 'INR', description, transactionId } = req.body;
    
    if (!amount || !transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Amount and transaction ID are required'
      });
    }
    
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt: transactionId,
      description,
      notes: {
        userId,
        transactionId
      }
    };
    
    const order = await razorpay.orders.create(options);
    
    res.json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    console.error('Razorpay order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
});

/**
 * POST /api/payments/verify
 * Verify Razorpay payment
 */
router.post('/verify', async (req, res) => {
  try {
    const userId = req.userId;
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, transactionId } = req.body;
    
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification details are required'
      });
    }
    
    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');
    
    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }
    
    // Update transaction status
    await db.collection('transactions').doc(transactionId).update({
      status: 'completed',
      paymentStatus: 'success',
      razorpayPaymentId: razorpay_payment_id,
      completedAt: new Date()
    });
    
    // Update product status if marketplace
    const transactionDoc = await db.collection('transactions').doc(transactionId).get();
    const transaction = transactionDoc.data();
    
    if (transaction.itemType === 'product') {
      await db.collection('marketplace').doc(transaction.itemId).update({
        status: 'sold',
        soldAt: new Date(),
        soldTo: userId
      });
    }
    
    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        transactionId,
        paymentId: razorpay_payment_id
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
      error: error.message
    });
  }
});

/**
 * GET /api/payments/history
 * Get user's payment history
 */
router.get('/history', async (req, res) => {
  try {
    const userId = req.userId;
    
    const transactionsSnapshot = await db.collection('transactions')
      .where('buyerId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const transactions = transactionsSnapshot.docs.map(doc => ({
      transactionId: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
      error: error.message
    });
  }
});

module.exports = router;
