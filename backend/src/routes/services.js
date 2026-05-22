const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getFirestore } = require('../config/firebase');
const admin = require('firebase-admin');

const db = getFirestore();

/**
 * GET /api/services
 * Get service providers
 */
router.get('/', async (req, res) => {
  try {
    const { serviceType, locality, limit = 20 } = req.query;
    
    let query = db.collection('services')
      .where('verified', '==', true)
      .limit(parseInt(limit));
    
    if (serviceType) {
      query = query.where('serviceType', '==', serviceType);
    }
    
    const servicesSnapshot = await query.get();
    const services = servicesSnapshot.docs.map(doc => ({
      serviceId: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      data: services,
      total: services.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services',
      error: error.message
    });
  }
});

/**
 * POST /api/services
 * Create service listing (for service providers)
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.userId;
    const {
      serviceType,
      description,
      expertise,
      yearsOfExperience,
      pricing,
      serviceArea,
      images
    } = req.body;
    
    if (!serviceType) {
      return res.status(400).json({
        success: false,
        message: 'Service type is required'
      });
    }
    
    const serviceId = uuidv4();
    
    const serviceData = {
      serviceId,
      providerId: userId,
      serviceType,
      description,
      expertise: expertise || [],
      yearsOfExperience: yearsOfExperience || 0,
      available: true,
      pricing: pricing || {},
      serviceArea: serviceArea || {},
      images: images || [],
      verified: false,
      verificationBadge: 'unverified',
      ratings: 0,
      reviewCount: 0,
      reviews: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('services').doc(serviceId).set(serviceData);
    
    res.status(201).json({
      success: true,
      message: 'Service listing created. Awaiting verification.',
      data: serviceData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create service listing',
      error: error.message
    });
  }
});

/**
 * GET /api/services/:serviceId
 * Get service details
 */
router.get('/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params;
    
    const serviceDoc = await db.collection('services').doc(serviceId).get();
    
    if (!serviceDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        serviceId: serviceDoc.id,
        ...serviceDoc.data()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service',
      error: error.message
    });
  }
});

/**
 * POST /api/services/booking
 * Book a service
 */
router.post('/booking', async (req, res) => {
  try {
    const userId = req.userId;
    const { serviceId, date, description } = req.body;
    
    if (!serviceId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Service ID and date are required'
      });
    }
    
    const bookingId = uuidv4();
    const booking = {
      bookingId,
      userId,
      serviceId,
      date: new Date(date),
      description,
      status: 'pending',
      createdAt: new Date()
    };
    
    await db.collection('bookings').doc(bookingId).set(booking);
    
    res.status(201).json({
      success: true,
      message: 'Booking request sent to service provider',
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create booking',
      error: error.message
    });
  }
});

module.exports = router;
