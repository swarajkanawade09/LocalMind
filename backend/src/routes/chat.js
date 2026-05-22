const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getFirestore } = require('../config/firebase');
const admin = require('firebase-admin');

const db = getFirestore();

/**
 * GET /api/chat/conversations
 * Get all chat conversations for user
 */
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.userId;
    
    const chatsSnapshot = await db.collection('chats')
      .where('participants', 'array-contains', userId)
      .orderBy('lastMessageTime', 'desc')
      .get();
    
    const chats = chatsSnapshot.docs.map(doc => ({
      chatId: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      data: chats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
      error: error.message
    });
  }
});

/**
 * POST /api/chat/conversations
 * Create new chat conversation
 */
router.post('/conversations', async (req, res) => {
  try {
    const userId = req.userId;
    const { targetUserId, type = 'direct' } = req.body;
    
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Target user ID is required'
      });
    }
    
    const participants = [userId, targetUserId].sort();
    const chatId = `${participants[0]}_${participants[1]}`;
    
    // Check if chat already exists
    const existingChat = await db.collection('chats').doc(chatId).get();
    
    if (existingChat.exists) {
      return res.json({
        success: true,
        message: 'Chat already exists',
        data: {
          chatId,
          ...existingChat.data()
        }
      });
    }
    
    const chatData = {
      type,
      participants,
      lastMessage: '',
      lastMessageSender: '',
      lastMessageTime: new Date(),
      unreadCount: {},
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('chats').doc(chatId).set(chatData);
    
    res.status(201).json({
      success: true,
      message: 'Chat created successfully',
      data: {
        chatId,
        ...chatData
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create chat',
      error: error.message
    });
  }
});

/**
 * GET /api/chat/:chatId/messages
 * Get messages from a chat
 */
router.get('/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const messagesSnapshot = await db.collection('chats')
      .doc(chatId)
      .collection('messages')
      .orderBy('timestamp', 'desc')
      .limit(parseInt(limit))
      .get();
    
    const messages = messagesSnapshot.docs.map(doc => ({
      messageId: doc.id,
      ...doc.data()
    })).reverse();
    
    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
});

/**
 * POST /api/chat/:chatId/message
 * Send a message
 */
router.post('/:chatId/message', async (req, res) => {
  try {
    const userId = req.userId;
    const { chatId } = req.params;
    const { content, type = 'text', mediaUrl } = req.body;
    
    if (!content && !mediaUrl) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }
    
    const messageId = uuidv4();
    const messageData = {
      messageId,
      chatId,
      senderId: userId,
      content,
      type,
      mediaUrl,
      isRead: false,
      reactions: {},
      timestamp: new Date(),
      sentAt: new Date()
    };
    
    // Add message to chat
    await db.collection('chats')
      .doc(chatId)
      .collection('messages')
      .doc(messageId)
      .set(messageData);
    
    // Update last message in chat
    await db.collection('chats').doc(chatId).update({
      lastMessage: content || `[${type.toUpperCase()}]`,
      lastMessageSender: userId,
      lastMessageTime: new Date(),
      updatedAt: new Date()
    });
    
    // Emit via Socket.io
    if (req.app.io) {
      req.app.io.to(`chat:${chatId}`).emit('receive-message', messageData);
    }
    
    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: messageData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
});

module.exports = router;
