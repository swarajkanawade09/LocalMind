const express = require('express');
const router = express.Router();
const { getFirestore } = require('../config/firebase');
const { OpenAI } = require('openai');

const db = getFirestore();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * POST /api/ai/search
 * AI-powered search across posts, products, businesses
 */
router.post('/search', async (req, res) => {
  try {
    const userId = req.userId;
    const { query, type = 'all' } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    // Get user locality for location-based search
    const userDoc = await db.collection('users').doc(userId).get();
    const { locality } = userDoc.data().location;
    
    let results = {};
    
    // Search posts
    if (type === 'all' || type === 'posts') {
      const postsSnapshot = await db.collection('posts')
        .where('location.locality', '==', locality)
        .where('status', '==', 'active')
        .get();
      
      results.posts = postsSnapshot.docs
        .map(doc => ({
          postId: doc.id,
          ...doc.data()
        }))
        .filter(post => 
          post.content.toLowerCase().includes(query.toLowerCase()) ||
          post.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
        )
        .slice(0, 5);
    }
    
    // Search products
    if (type === 'all' || type === 'products') {
      const productsSnapshot = await db.collection('marketplace')
        .where('location.locality', '==', locality)
        .where('status', '==', 'active')
        .get();
      
      results.products = productsSnapshot.docs
        .map(doc => ({
          productId: doc.id,
          ...doc.data()
        }))
        .filter(product => 
          product.title.toLowerCase().includes(query.toLowerCase()) ||
          product.description.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 5);
    }
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message
    });
  }
});

/**
 * POST /api/ai/recommendations
 * Get AI-powered recommendations
 */
router.post('/recommendations', async (req, res) => {
  try {
    const userId = req.userId;
    const { type = 'all' } = req.body; // people, services, products, businesses
    
    // Get user preferences
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const { locality } = userData.location;
    const { interests } = userData.preferences;
    
    let recommendations = {};
    
    // Recommend people with similar interests
    if (type === 'all' || type === 'people') {
      const usersSnapshot = await db.collection('users')
        .where('location.locality', '==', locality)
        .limit(20)
        .get();
      
      recommendations.people = usersSnapshot.docs
        .map(doc => doc.data())
        .filter(u => u.userId !== userId)
        .sort((a, b) => {
          const aMatch = a.preferences.interests.filter(i => interests.includes(i)).length;
          const bMatch = b.preferences.interests.filter(i => interests.includes(i)).length;
          return bMatch - aMatch;
        })
        .slice(0, 5);
    }
    
    // Recommend services
    if (type === 'all' || type === 'services') {
      const servicesSnapshot = await db.collection('services')
        .where('verified', '==', true)
        .limit(20)
        .get();
      
      recommendations.services = servicesSnapshot.docs
        .map(doc => ({
          serviceId: doc.id,
          ...doc.data()
        }))
        .slice(0, 5);
    }
    
    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendations',
      error: error.message
    });
  }
});

/**
 * POST /api/ai/summarize
 * Summarize community discussion
 */
router.post('/summarize', async (req, res) => {
  try {
    const { communityId } = req.body;
    
    if (!communityId) {
      return res.status(400).json({
        success: false,
        message: 'Community ID is required'
      });
    }
    
    // Get recent posts from community
    const postsSnapshot = await db.collection('posts')
      .where('visibility.communityId', '==', communityId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    
    const posts = postsSnapshot.docs.map(doc => doc.data());
    const postContents = posts.map(p => p.content).join('\n\n');
    
    // Use OpenAI to summarize
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes community discussions.'
        },
        {
          role: 'user',
          content: `Please provide a concise summary of the following community discussion:\n\n${postContents}`
        }
      ],
      max_tokens: 200
    });
    
    const summary = completion.choices[0].message.content;
    
    res.json({
      success: true,
      data: {
        summary,
        postsCount: posts.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to summarize discussion',
      error: error.message
    });
  }
});

/**
 * POST /api/ai/detect-spam
 * Detect spam/scam content
 */
router.post('/detect-spam', async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Content is required'
      });
    }
    
    // Use OpenAI moderation API
    const response = await openai.moderations.create({
      input: content
    });
    
    const flagged = response.results[0].flagged;
    const categories = response.results[0].categories;
    
    res.json({
      success: true,
      data: {
        flagged,
        categories,
        confidence: response.results[0].category_scores
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check spam',
      error: error.message
    });
  }
});

module.exports = router;
