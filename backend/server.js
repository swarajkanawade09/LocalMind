const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const socketIO = require('socket.io');
const compression = require('compression');
const morgan = require('morgan');
const http = require('http');
require('dotenv').config();
require('express-async-errors');

const { initializeFirebase } = require('./src/config/firebase');
const { initializeRedis } = require('./src/config/redis');
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/users');
const postRoutes = require('./src/routes/posts');
const marketplaceRoutes = require('./src/routes/marketplace');
const servicesRoutes = require('./src/routes/services');
const businessRoutes = require('./src/routes/businesses');
const communityRoutes = require('./src/routes/communities');
const chatRoutes = require('./src/routes/chat');
const notificationRoutes = require('./src/routes/notifications');
const mapRoutes = require('./src/routes/map');
const paymentRoutes = require('./src/routes/payments');
const aiRoutes = require('./src/routes/ai');
const adminRoutes = require('./src/routes/admin');

const errorHandler = require('./src/middleware/errorHandler');
const { authenticate } = require('./src/middleware/auth');

const app = express();
const server = http.createServer(app);

// Initialize Firebase & Redis
initializeFirebase();
initializeRedis();

// ==================== MIDDLEWARE ====================

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression & Parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Logging
app.use(morgan('combined'));

// ==================== SOCKET.IO SETUP ====================

const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Socket authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication failed'));
  
  try {
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});

// Socket event handlers
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId}`);
  
  // Join user-specific room
  socket.join(`user:${socket.userId}`);
  
  // Chat events
  socket.on('join-chat', (chatId) => {
    socket.join(`chat:${chatId}`);
  });
  
  socket.on('leave-chat', (chatId) => {
    socket.leave(`chat:${chatId}`);
  });
  
  socket.on('send-message', (data) => {
    // Handle message sending
    io.to(`chat:${data.chatId}`).emit('receive-message', data);
  });
  
  socket.on('typing', (data) => {
    io.to(`chat:${data.chatId}`).emit('user-typing', {
      userId: socket.userId,
      isTyping: true
    });
  });
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`);
  });
});

// Attach io to app
app.io = io;

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticate, userRoutes);
app.use('/api/posts', authenticate, postRoutes);
app.use('/api/marketplace', authenticate, marketplaceRoutes);
app.use('/api/services', authenticate, servicesRoutes);
app.use('/api/businesses', authenticate, businessRoutes);
app.use('/api/communities', authenticate, communityRoutes);
app.use('/api/chat', authenticate, chatRoutes);
app.use('/api/notifications', authenticate, notificationRoutes);
app.use('/api/map', authenticate, mapRoutes);
app.use('/api/payments', authenticate, paymentRoutes);
app.use('/api/ai', authenticate, aiRoutes);
app.use('/api/admin', authenticate, adminRoutes);

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use(errorHandler);

// ==================== SERVER START ====================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`\n🚀 LocalMind Backend running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 API URL: ${process.env.BACKEND_URL}`);
  console.log(`\n✨ Server is ready to accept connections\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server, io };
