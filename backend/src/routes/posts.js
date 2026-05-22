const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getFirestore } = require('../config/firebase');

const db = getFirestore();

/**
 * GET /api/posts
 * Get home feed with posts from nearby locality
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 20, offset = 0 } = req.query;
    
    // Get user's locality
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const { locality } = userData.location;
    
    // Get posts from same locality
    let query = db.collection('posts')
      .where('location.locality', '==', locality)
      .where('status', '==', 'active')
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit));
    
    if (offset > 0) {
      const offsetDoc = await db.collection('posts')
        .where('location.locality', '==', locality)
        .orderBy('createdAt', 'desc')
        .offset(parseInt(offset))
        .limit(1)
        .get();
      
      if (!offsetDoc.empty) {
        query = query.startAfter(offsetDoc.docs[0]);
      }
    }
    
    const postsSnapshot = await query.get();
    const posts = postsSnapshot.docs.map(doc => ({
      postId: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      data: posts,
      total: posts.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch posts',
      error: error.message
    });
  }
});

/**
 * POST /api/posts
 * Create a new post
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.userId;
    const {
      content,
      type,
      category,
      tags,
      imageUrls,
      location,
      visibility
    } = req.body;
    
    if (!content || !type) {
      return res.status(400).json({
        success: false,
        message: 'Content and type are required'
      });
    }
    
    const postId = uuidv4();
    
    const postData = {
      postId,
      authorId: userId,
      content,
      type,
      category: category || '',
      tags: tags || [],
      imageUrls: imageUrls || [],
      location: location || {},
      visibility: visibility || { type: 'nearby5km', radius: 5 },
      engagement: {
        likes: 0,
        comments: 0,
        shares: 0,
        likedBy: [],
        commentsList: []
      },
      aiMetadata: {
        relevanceScore: 50,
        hasBeenModerated: false,
        flaggedForSpam: false,
        spamConfidence: 0
      },
      status: 'active',
      isPinned: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('posts').doc(postId).set(postData);
    
    // Update user's post count
    const admin = require('firebase-admin');
    await db.collection('users').doc(userId).update({
      'socialStats.totalPosts': admin.firestore.FieldValue.increment(1)
    });
    
    // Emit real-time update via Socket.io
    if (req.app.io) {
      req.app.io.to(`locality:${postData.location.locality}`).emit('new-post', postData);
    }
    
    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: postData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create post',
      error: error.message
    });
  }
});

/**
 * GET /api/posts/:postId
 * Get post details
 */
router.get('/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    
    const postDoc = await db.collection('posts').doc(postId).get();
    
    if (!postDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        postId: postDoc.id,
        ...postDoc.data()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch post',
      error: error.message
    });
  }
});

/**
 * PUT /api/posts/:postId
 * Update post
 */
router.put('/:postId', async (req, res) => {
  try {
    const userId = req.userId;
    const { postId } = req.params;
    const { content, tags, imageUrls } = req.body;
    
    const postDoc = await db.collection('posts').doc(postId).get();
    
    if (!postDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    const postData = postDoc.data();
    
    if (postData.authorId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to update this post'
      });
    }
    
    const updateData = { updatedAt: new Date() };
    if (content) updateData.content = content;
    if (tags) updateData.tags = tags;
    if (imageUrls) updateData.imageUrls = imageUrls;
    
    await db.collection('posts').doc(postId).update(updateData);
    
    const updatedPost = await db.collection('posts').doc(postId).get();
    
    res.json({
      success: true,
      message: 'Post updated successfully',
      data: {
        postId: updatedPost.id,
        ...updatedPost.data()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update post',
      error: error.message
    });
  }
});

/**
 * DELETE /api/posts/:postId
 * Delete post
 */
router.delete('/:postId', async (req, res) => {
  try {
    const userId = req.userId;
    const { postId } = req.params;
    
    const postDoc = await db.collection('posts').doc(postId).get();
    
    if (!postDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    const postData = postDoc.data();
    
    if (postData.authorId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to delete this post'
      });
    }
    
    await db.collection('posts').doc(postId).update({
      status: 'deleted',
      updatedAt: new Date()
    });
    
    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete post',
      error: error.message
    });
  }
});

/**
 * POST /api/posts/:postId/like
 * Like a post
 */
router.post('/:postId/like', async (req, res) => {
  try {
    const userId = req.userId;
    const { postId } = req.params;
    const admin = require('firebase-admin');
    
    const postRef = db.collection('posts').doc(postId);
    const postDoc = await postRef.get();
    
    if (!postDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    
    const likedBy = postDoc.data().engagement.likedBy || [];
    
    if (!likedBy.includes(userId)) {
      await postRef.update({
        'engagement.likes': admin.firestore.FieldValue.increment(1),
        'engagement.likedBy': admin.firestore.FieldValue.arrayUnion(userId)
      });
    }
    
    res.json({
      success: true,
      message: 'Post liked successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to like post',
      error: error.message
    });
  }
});

/**
 * POST /api/posts/:postId/comment
 * Add comment to post
 */
router.post('/:postId/comment', async (req, res) => {
  try {
    const userId = req.userId;
    const { postId } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Comment content is required'
      });
    }
    
    const commentId = uuidv4();
    const comment = {
      commentId,
      userId,
      content,
      createdAt: new Date()
    };
    
    const admin = require('firebase-admin');
    const postRef = db.collection('posts').doc(postId);
    
    await postRef.update({
      'engagement.comments': admin.firestore.FieldValue.increment(1),
      'engagement.commentsList': admin.firestore.FieldValue.arrayUnion(comment)
    });
    
    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: comment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add comment',
      error: error.message
    });
  }
});

module.exports = router;
