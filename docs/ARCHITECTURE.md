# LocalMind - System Architecture

## 🏗️ Architecture Overview

LocalMind is built on a **modern, scalable microservices architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER (Flutter)                    │
│         Mobile App for iOS & Android Users                   │
└────────────┬────────────────────────────────┬────────────────┘
             │                                │
             ▼                                ▼
      ┌─────────────────┐          ┌─────────────────┐
      │   API Gateway   │          │  WebSocket      │
      │  (Express)      │          │  (Socket.io)    │
      └────────┬────────┘          └────────┬────────┘
               │                           │
   ┌───────────┴──────────────────────────┴──────────┐
   │                                                  │
   ▼                                                  ▼
┌──────────────────────────────────────────────────────────┐
│              BACKEND SERVICE LAYER (Node.js)             │
│                                                          │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐  │
│  │  Auth       │ │  Posts      │ │  Marketplace     │  │
│  │  Service    │ │  Service    │ │  Service         │  │
│  └─────────────┘ └─────────────┘ └──────────────────┘  │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐  │
│  │  User       │ │  Chat       │ │  AI Service      │  │
│  │  Service    │ │  Service    │ │  (OpenAI/Gemini) │  │
│  └─────────────┘ └─────────────┘ └──────────────────┘  │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐  │
│  │  Map        │ │  Business   │ │  Notification    │  │
│  │  Service    │ │  Service    │ │  Service         │  │
│  └─────────────┘ └─────────────┘ └──────────────────┘  │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐  │
│  │  Community  │ │  Admin      │ │  Payment         │  │
│  │  Service    │ │  Service    │ │  Service         │  │
│  └─────────────┘ └─────────────┘ └──────────────────┘  │
└──────────────────────────────────────────────────────────┘
   │                  │                  │
   ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Firestore   │  │  Redis Cache │  │  PostgreSQL  │
│  (Real-time) │  │  (Sessions)  │  │  (Analytics) │
└──────────────┘  └──────────────┘  └──────────────┘
   │
   ▼
┌──────────────────────────────────────┐
│    Firebase Storage (Images/Media)    │
└──────────────────────────────────────┘

   ▼
┌─────────────────────────────────────┐
│   External Services Integration      │
│ ┌─────────────┐ ┌─────────────────┐ │
│ │  Google Maps│ │  Twilio (SMS)   │ │
│ │  API        │ │                 │ │
│ ├─────────────┤ ├─────────────────┤ │
│ │  Razorpay   │ │  SendGrid Email │ │
│ │  (Payments) │ │                 │ │
│ └─────────────┘ └─────────────────┘ │
└─────────────────────────────────────┘
```

---

## 🔐 Authentication Flow

```
┌──────────────────────────────────────────────┐
│            User Registration                  │
└──────────────────────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────┐
    │  1. User enters phone number      │
    │  2. Twilio sends OTP              │
    │  3. User verifies OTP             │
    └───────────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────┐
    │  4. Create Firestore user record  │
    │  5. Generate JWT token            │
    │  6. Store in secure storage       │
    └───────────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────┐
    │  7. Optional: Location permission │
    │  8. Optional: Building verify     │
    │  9. Profile setup                 │
    └───────────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────────┐
    │  User logged in & authenticated   │
    └───────────────────────────────────┘
```

---

## 🗄️ Database Architecture

### Firestore Collections Structure

```
firestore/
├── users/
│   ├── {userId}/
│   │   ├── profile (name, photo, bio)
│   │   ├── contact (phone, email)
│   │   ├── location (latitude, longitude, locality)
│   │   ├── preferences (language, interests)
│   │   ├── verification (verified, buildingId)
│   │   ├── socialStats (posts, followers, following)
│   │   └── createdAt, updatedAt
│   └── ...
├── posts/
│   ├── {postId}/
│   │   ├── authorId, content, type (alert/buysell/service/event)
│   │   ├── category, tags, images
│   │   ├── location (geo-tagged)
│   │   ├── visibility (radius: 2km, 5km, 10km)
│   │   ├── engagement (likes, comments, shares)
│   │   ├── aiRanking (relevance score)
│   │   ├── status (active/archived)
│   │   └── createdAt, updatedAt
│   └── ...
├── marketplace/
│   ├── {productId}/
│   │   ├── sellerId, title, description, price
│   │   ├── category, condition, images
│   │   ├── location, pickupDetails
│   │   ├── status (available/sold/removed)
│   │   ├── reviews, ratings
│   │   ├── aiPriceEstimate
│   │   └── createdAt, updatedAt
│   └── ...
├── services/
│   ├── {serviceId}/
│   │   ├── providerId, serviceType (plumber, electrician, etc.)
│   │   ├── description, hourlyRate, dailyRate
│   │   ├── location, serviceArea, experience
│   │   ├── images, certifications
│   │   ├── ratings, reviews, availability
│   │   ├── verified, verificationBadge
│   │   └── createdAt, updatedAt
│   └── ...
├── businesses/
│   ├── {businessId}/
│   │   ├── ownerId, name, category
│   │   ├── description, logo, banner
│   │   ├── location (geo-point), address
│   │   ├── contact (phone, whatsapp, email)
│   │   ├── hours, website, social links
│   │   ├── verified, badge, followers
│   │   ├── posts, promotions, analytics
│   │   └── createdAt, updatedAt
│   └── ...
├── communities/
│   ├── {communityId}/
│   │   ├── name, description, type (society/college/area)
│   │   ├── location, members, admins
│   │   ├── verified (society verification)
│   │   ├── privacy (public/private)
│   │   ├── rules, guidelines
│   │   └── createdAt, updatedAt
│   └── ...
├── chats/
│   ├── {chatId}/
│   │   ├── participants (userId array)
│   │   ├── type (direct/group)
│   │   ├── lastMessage, lastMessageTime
│   │   ├── unreadCount
│   │   └── createdAt
│   └── ...
├── messages/
│   ├── {messageId}/
│   │   ├── chatId, senderId, content
│   │   ├── type (text/image/voice/location)
│   │   ├── reactions, replies
│   │   ├── isRead, readAt
│   │   └── timestamp, editedAt
│   └── ...
├── notifications/
│   ├── {notificationId}/
│   │   ├── userId, title, message
│   │   ├── type (like/comment/follow/order)
│   │   ├── relatedId (post/user/order)
│   │   ├── isRead, isArchived
│   │   └── createdAt
│   └── ...
├── transactions/
│   ├── {transactionId}/
│   │   ├── buyerId, sellerId, productId
│   │   ├── amount, status (pending/completed/failed)
│   │   ├── paymentMethod, orderId
│   │   ├── pickupLocation, deliveryDetails
│   │   └── createdAt, completedAt
│   └── ...
└── settings/
    ├── appConfig (version, features)
    ├── aiSettings (models, parameters)
    ├── moderationRules
    └── lastUpdated
```

---

## 🔄 Data Flow for Key Features

### 1. Home Feed Generation

```
1. User opens app
   │
   ├─ Get user location
   ├─ Get user interests/preferences
   └─ Get user's followed communities
   │
   ▼
2. Backend queries posts within radius
   │
   ├─ Firestore Query: locality = user.locality
   ├─ Filter by timestamp (recent first)
   └─ Exclude muted users/blocked content
   │
   ▼
3. AI Ranking Engine (OpenAI/Gemini)
   │
   ├─ Analyze post relevance
   ├─ Calculate engagement score
   ├─ Apply user preference weights
   └─ Return ranked feed
   │
   ▼
4. Real-time updates via Socket.io
   │
   └─ Push new posts as they arrive
```

### 2. Marketplace Transaction Flow

```
1. Seller creates listing
   │
   ├─ Upload images → Firebase Storage
   ├─ Extract details → Firestore
   └─ AI price suggestion (optional)
   │
   ▼
2. Buyer discovers product
   │
   ├─ Search/browse marketplace
   ├─ View product details
   └─ Check seller ratings
   │
   ▼
3. Buyer initiates chat
   │
   ├─ Create chat document
   ├─ Enable real-time messaging
   └─ Notify seller via FCM
   │
   ▼
4. Agreement & Payment
   │
   ├─ Buyer clicks "Buy Now"
   ├─ Razorpay payment gateway
   ├─ Verify payment → Firestore transaction
   └─ Notify both parties
   │
   ▼
5. Order Completion
   │
   ├─ Exchange location/pickup details
   ├─ Mark as completed
   └─ Enable ratings/reviews
```

### 3. AI Content Moderation

```
New post/message created
   │
   ▼
Send to OpenAI Moderation API
   │
   ├─ Check for spam
   ├─ Detect toxic content
   ├─ Identify scams (phone numbers, links)
   └─ Flag inappropriate images
   │
   ▼
Moderation Result
   │
   ├─ APPROVED → Publish to feed
   ├─ FLAGGED → Notify moderator
   └─ REJECTED → Notify user with reason
```

---

## 🔌 API Layer Architecture

### REST Endpoints

```
AUTHENTICATION
  POST   /api/auth/send-otp              - Send OTP to phone
  POST   /api/auth/verify-otp            - Verify OTP & get token
  POST   /api/auth/refresh-token         - Refresh JWT token
  POST   /api/auth/logout                - Logout user

USERS
  GET    /api/users/profile              - Get current user profile
  PUT    /api/users/profile              - Update profile
  GET    /api/users/nearby               - Get nearby users
  POST   /api/users/follow               - Follow user
  POST   /api/users/unfollow             - Unfollow user
  GET    /api/users/{userId}             - Get user details

POSTS
  GET    /api/posts                      - Get home feed
  POST   /api/posts                      - Create post
  GET    /api/posts/{postId}             - Get post details
  PUT    /api/posts/{postId}             - Update post
  DELETE /api/posts/{postId}             - Delete post
  POST   /api/posts/{postId}/like        - Like post
  POST   /api/posts/{postId}/comment     - Add comment
  POST   /api/posts/{postId}/share       - Share post

MARKETPLACE
  GET    /api/marketplace                - Get products feed
  POST   /api/marketplace                - Create product listing
  GET    /api/marketplace/{productId}    - Get product details
  PUT    /api/marketplace/{productId}    - Update listing
  DELETE /api/marketplace/{productId}    - Remove listing
  POST   /api/marketplace/{productId}/buy - Initiate purchase

SERVICES
  GET    /api/services                   - Get service providers
  GET    /api/services/{serviceId}       - Get service details
  POST   /api/services/booking           - Book service
  GET    /api/services/search            - Search by category
  PUT    /api/services/{serviceId}/review - Add review

BUSINESSES
  GET    /api/businesses                 - Get nearby businesses
  GET    /api/businesses/{businessId}    - Get business profile
  POST   /api/businesses                 - Create business profile
  PUT    /api/businesses/{businessId}    - Update business info
  POST   /api/businesses/{businessId}/follow - Follow business
  GET    /api/businesses/{businessId}/posts - Get business posts

COMMUNITIES
  GET    /api/communities                - Get communities
  POST   /api/communities                - Create community
  GET    /api/communities/{communityId}  - Get community details
  POST   /api/communities/{communityId}/join - Join community
  GET    /api/communities/{communityId}/posts - Get community feed
  POST   /api/communities/{communityId}/poll - Create poll

CHAT
  GET    /api/chat/conversations         - Get all chats
  POST   /api/chat/conversations         - Create new chat
  GET    /api/chat/{chatId}/messages     - Get messages
  POST   /api/chat/{chatId}/message      - Send message
  DELETE /api/chat/{chatId}/message/{messageId} - Delete message
  POST   /api/chat/{chatId}/typing       - Typing indicator

NOTIFICATIONS
  GET    /api/notifications              - Get all notifications
  PUT    /api/notifications/{notificationId} - Mark as read
  DELETE /api/notifications/{notificationId} - Delete notification
  PUT    /api/notifications/mark-all-read   - Mark all as read

MAP
  GET    /api/map/nearby                 - Get nearby events/businesses
  GET    /api/map/alerts                 - Get area alerts
  GET    /api/map/lost-found             - Get lost & found posts

PAYMENTS
  POST   /api/payments/create-order      - Create Razorpay order
  POST   /api/payments/verify            - Verify payment
  GET    /api/payments/history           - Get payment history

AI
  POST   /api/ai/search                  - AI-powered search
  POST   /api/ai/recommendations         - Get AI recommendations
  POST   /api/ai/summarize               - Summarize discussion
  POST   /api/ai/detect-spam             - Detect spam/scams

ADMIN
  GET    /api/admin/users                - List all users
  GET    /api/admin/reports              - Get reported content
  POST   /api/admin/ban-user             - Ban user
  POST   /api/admin/remove-content       - Remove content
  GET    /api/admin/analytics            - Get app analytics
```

---

## 📊 Scalability Considerations

### Database Indexing
- Index on `locality + timestamp` for feed queries
- Index on `location (geo-point)` for nearby searches
- Index on `userId` for user-specific queries
- Index on `createdAt` for time-based sorting

### Caching Strategy
- **User profiles**: Redis TTL 24 hours
- **Popular posts**: Redis TTL 1 hour
- **Business listings**: Redis TTL 6 hours
- **AI embeddings**: Redis TTL 7 days

### Load Balancing
- Multiple Node.js instances behind load balancer
- Database read replicas for analytics queries
- CDN for static assets (images, logos)

### Rate Limiting
- 100 requests/minute per user (authenticated)
- 10 requests/minute per user (unauthenticated)
- Higher limits for admin endpoints

---

## 🔒 Security Architecture

### Data Protection
- **Encryption in transit**: TLS 1.3
- **Encryption at rest**: Firebase automatic encryption
- **API Keys**: Environment variables only, never exposed
- **Sensitive data**: User phone, email stored encrypted

### Access Control
- **JWT tokens**: 24-hour expiry
- **Refresh tokens**: 7-day expiry
- **RBAC**: User, Business, Admin, Moderator roles
- **Row-level security**: Firestore Security Rules

### Fraud Detection
- AI monitors unusual patterns
- Multiple failed transactions flagged
- Same device multiple accounts flagged
- Spam content auto-moderated

---

## 🚀 Deployment Architecture

```
Production Environment
├── Firebase (Primary)
│   ├── Firestore (Database)
│   ├── Storage (Images)
│   ├── Authentication
│   ├── Cloud Functions (Background jobs)
│   └── Hosting (APIs)
├── Cloud Run (Node.js Backend)
│   ├── Auto-scaling (0-100 instances)
│   ├── Health checks
│   └── Traffic splitting
├── Redis (Google Memorystore)
│   └── 5GB capacity, high availability
└── CDN (Cloudflare)
    ├── Image optimization
    ├── DDoS protection
    └── Global caching
```

---

*Last Updated: May 22, 2026*
