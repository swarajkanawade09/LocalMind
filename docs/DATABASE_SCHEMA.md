# LocalMind - Database Schema

## 📊 Firestore Collections & Documents

### 1. Users Collection

**Collection Path:** `/users/{userId}`

```javascript
{
  // Basic Info
  userId: "string (auto-generated)",
  phone: "string (encrypted)",
  email: "string (encrypted, optional)",
  
  // Profile
  profile: {
    firstName: "string",
    lastName: "string",
    displayName: "string",
    profilePictureUrl: "string (Firebase Storage URL)",
    bio: "string (max 150 chars)",
    age: "number (optional)",
    gender: "string (optional)"
  },
  
  // Location & Locality
  location: {
    latitude: "number",
    longitude: "number",
    geoHash: "string (for geo-queries)",
    locality: "string (e.g., 'Bandra, Mumbai')",
    city: "string",
    state: "string",
    pincode: "string"
  },
  
  // Verification
  verification: {
    isPhoneVerified: "boolean",
    isEmailVerified: "boolean",
    isBuildingVerified: "boolean",
    buildingId: "string (reference to communities)",
    societyVerificationDoc: "string (Storage URL, optional)",
    verifiedBadge: "boolean"
  },
  
  // Preferences
  preferences: {
    language: "string (default: 'en')",
    interests: "array of strings",
    notificationPreferences: {
      pushNotifications: "boolean",
      emailNotifications: "boolean",
      nearbyActivityRadius: "number (in km, default: 5)"
    },
    privacySettings: {
      showLocation: "boolean",
      showProfile: "boolean",
      allowMessages: "boolean"
    }
  },
  
  // Social Stats
  socialStats: {
    totalPosts: "number",
    followers: "number",
    following: "number",
    reputation: "number",
    blockedUsers: "array of userId"
  },
  
  // Account Status
  accountStatus: "string (active/suspended/deleted)",
  suspensionReason: "string (optional)",
  
  // Timestamps
  createdAt: "timestamp",
  updatedAt: "timestamp",
  lastLoginAt: "timestamp"
}
```

**Indexes:**
- `locality + createdAt` (for local discovery)
- `location (geoPoint)` (for nearby searches)
- `phone` (unique, for auth)

---

### 2. Posts Collection

**Collection Path:** `/posts/{postId}`

```javascript
{
  postId: "string (auto-generated)",
  authorId: "string (reference to users)",
  
  // Content
  content: "string (max 5000 chars)",
  type: "enum (alert/buysell/service/event/recommendation)",
  category: "string (based on type)",
  tags: "array of strings",
  imageUrls: "array of strings (Firebase Storage URLs)",
  videoUrl: "string (optional)",
  
  // Location & Visibility
  location: {
    latitude: "number",
    longitude: "number",
    geoHash: "string",
    locality: "string",
    address: "string (optional)"
  },
  visibility: {
    type: "enum (immediate/nearby5km/nearby10km/community)",
    radius: "number (in km)",
    communityId: "string (if visibility is community)"
  },
  
  // Engagement
  engagement: {
    likes: "number",
    comments: "number",
    shares: "number",
    likedBy: "array of userId (first 100)",
    commentsList: "array of comment objects (subcollection recommended)"
  },
  
  // AI & Ranking
  aiMetadata: {
    relevanceScore: "number (0-100)",
    hasBeenModerated: "boolean",
    flaggedForSpam: "boolean",
    spamConfidence: "number (0-100)"
  },
  
  // Status
  status: "enum (active/archived/deleted)",
  isPinned: "boolean (only for community posts)",
  
  // Timestamps
  createdAt: "timestamp",
  updatedAt: "timestamp",
  expiresAt: "timestamp (optional, for temporary posts)"
}
```

**Subcollections:**
- `/posts/{postId}/comments` - Store comments separately
- `/posts/{postId}/reactions` - Store reactions with type

**Indexes:**
- `locality + createdAt` (for feed)
- `authorId + createdAt` (for user posts)
- `location (geoPoint)` (for map)

---

### 3. Marketplace Collection

**Collection Path:** `/marketplace/{productId}`

```javascript
{
  productId: "string (auto-generated)",
  sellerId: "string (reference to users)",
  
  // Product Details
  title: "string (max 150 chars)",
  description: "string (max 2000 chars)",
  category: "string (electronics/furniture/books/etc)",
  subcategory: "string",
  condition: "enum (new/like-new/good/fair)",
  
  // Pricing & Payment
  price: "number",
  originalPrice: "number (optional)",
  priceNegotiable: "boolean",
  currency: "string (default: 'INR')",
  aiPriceEstimate: "number (optional, AI generated)",
  
  // Images
  imageUrls: "array of strings (1-10 images, Firebase Storage)",
  thumbnailUrl: "string (generated automatically)",
  
  // Location
  location: {
    latitude: "number",
    longitude: "number",
    address: "string",
    locality: "string",
    deliveryAvailable: "boolean",
    deliveryRadius: "number (in km, if available)"
  },
  
  // Listing Details
  pickupDetails: {
    method: "enum (handoff/delivery/shipping)",
    location: "string",
    timeSlots: "array of objects"
  },
  
  // Engagement
  engagement: {
    views: "number",
    saves: "number",
    inquiries: "number",
    ratings: "number",
    reviews: "array of review objects (max 10)"
  },
  
  // Status
  status: "enum (active/sold/removed/expired)",
  soldAt: "timestamp (when sold)",
  soldTo: "string (userId, if sold)",
  
  // Timestamps
  createdAt: "timestamp",
  updatedAt: "timestamp",
  expiresAt: "timestamp (after 30 days)"
}
```

**Indexes:**
- `locality + status + createdAt` (for marketplace feed)
- `category + status + createdAt` (for browsing by category)
- `location (geoPoint)` (for nearby products)

---

### 4. Services Collection

**Collection Path:** `/services/{serviceId}`

```javascript
{
  serviceId: "string (auto-generated)",
  providerId: "string (reference to users)",
  
  // Service Details
  serviceType: "string (plumber/electrician/tutor/etc)",
  subCategory: "string",
  description: "string",
  expertise: "array of strings",
  yearsOfExperience: "number",
  
  // Availability & Pricing
  available: "boolean",
  availability: {
    days: "array of strings (Mon, Tue, etc)",
    startTime: "string (HH:mm format)",
    endTime: "string (HH:mm format)"
  },
  pricing: {
    hourlyRate: "number (optional)",
    dailyRate: "number (optional)",
    projectBased: "boolean",
    currency: "string (default: 'INR')",
    negotiable: "boolean"
  },
  
  // Service Area
  serviceArea: {
    latitude: "number",
    longitude: "number",
    radius: "number (in km)",
    localities: "array of strings"
  },
  
  // Credentials
  images: "array of strings (portfolio)",
  certifications: "array of objects {
    name: string,
    issuer: string,
    url: string,
    verificationStatus: enum
  }",
  
  // Verification & Rating
  verified: "boolean",
  verificationBadge: "string (gold/silver/bronze)",
  ratings: "number (0-5)",
  reviewCount: "number",
  
  // Reviews
  reviews: "array of review objects (max 10)",
  
  // Contact
  contact: {
    phone: "string",
    whatsapp: "string (optional)",
    email: "string (optional)"
  },
  
  // Timestamps
  createdAt: "timestamp",
  updatedAt: "timestamp"
}
```

**Indexes:**
- `serviceType + locality` (for service discovery)
- `serviceArea (geoPoint)` (for nearby services)
- `ratings` (for top-rated services)

---

### 5. Businesses Collection

**Collection Path:** `/businesses/{businessId}`

```javascript
{
  businessId: "string (auto-generated)",
  ownerId: "string (reference to users)",
  
  // Basic Info
  name: "string",
  tagline: "string (max 100 chars)",
  category: "string (cafe/salon/gym/etc)",
  description: "string",
  
  // Branding
  logoUrl: "string (Firebase Storage)",
  bannerUrl: "string (Firebase Storage)",
  websiteUrl: "string (optional)",
  
  // Contact & Location
  contact: {
    phone: "string",
    whatsapp: "string",
    email: "string",
    socialLinks: {
      instagram: "string",
      facebook: "string",
      twitter: "string"
    }
  },
  
  location: {
    latitude: "number",
    longitude: "number",
    geoHash: "string",
    address: "string",
    locality: "string",
    city: "string",
    pincode: "string"
  },
  
  // Business Details
  hours: {
    monday: { open: "HH:mm", close: "HH:mm", closed: boolean },
    // ... other days
  },
  
  // Verification & Status
  verified: "boolean",
  verificationBadge: "enum (gold/silver/bronze/unverified)",
  businessRegistration: "string (optional, GST/Store doc)",
  
  // Engagement
  followers: "number",
  reviews: "number",
  averageRating: "number (0-5)",
  topReviews: "array of review objects",
  
  // Monetization
  subscriptionTier: "enum (free/basic/premium)",
  subscriptionExpiresAt: "timestamp (if premium)",
  featuredUntil: "timestamp (if featured)",
  
  // Content
  totalPosts: "number",
  totalPromotions: "number",
  
  // Analytics
  analytics: {
    monthlyViews: "number",
    monthlyClicks: "number",
    monthlyMessages: "number",
    lastAnalyticsUpdate: "timestamp"
  },
  
  // Timestamps
  createdAt: "timestamp",
  updatedAt: "timestamp"
}
```

**Indexes:**
- `locality + verified + createdAt` (for business discovery)
- `location (geoPoint)` (for nearby businesses)
- `category + locality` (for category browsing)

---

### 6. Communities Collection

**Collection Path:** `/communities/{communityId}`

```javascript
{
  communityId: "string (auto-generated)",
  name: "string",
  description: "string",
  type: "enum (society/apartment/college/area/interest)",
  
  // Metadata
  logoUrl: "string (optional)",
  bannerUrl: "string (optional)",
  
  // Location
  location: {
    latitude: "number",
    longitude: "number",
    address: "string",
    pincode: "string"
  },
  
  // Membership
  totalMembers: "number",
  maxMembers: "number (optional)",
  
  // Verification (for societies)
  verified: "boolean",
  societyRegistration: "string (Storage URL, optional)",
  
  // Access
  privacy: "enum (public/private)",
  approvalRequired: "boolean",
  
  // Admin & Moderation
  admins: "array of userId",
  moderators: "array of userId",
  rules: "array of strings",
  
  // Content
  totalPosts: "number",
  totalPolls: "number",
  
  // Engagement
  totalDiscussions: "number",
  pinnedPosts: "array of postId",
  
  // Timestamps
  createdAt: "timestamp",
  updatedAt: "timestamp"
}
```

**Subcollections:**
- `/communities/{communityId}/members` - List of members with role
- `/communities/{communityId}/posts` - Community posts
- `/communities/{communityId}/polls` - Community polls
- `/communities/{communityId}/announcements` - Important announcements

---

### 7. Chats Collection

**Collection Path:** `/chats/{chatId}`

```javascript
{
  chatId: "string (auto-generated)",
  
  // Participants
  type: "enum (direct/group)",
  participants: "array of userId",
  participantNames: "array of strings (for group chats)",
  
  // Last Message
  lastMessage: "string",
  lastMessageSender: "string (userId)",
  lastMessageTime: "timestamp",
  lastMessageType: "enum (text/image/voice/location)",
  
  // Unread Count
  unreadCount: {
    userId1: "number",
    userId2: "number"
  },
  
  // Timestamps
  createdAt: "timestamp",
  updatedAt: "timestamp"
}
```

**Subcollections:**
- `/chats/{chatId}/messages` - Individual messages

### Messages Subcollection

**Collection Path:** `/chats/{chatId}/messages/{messageId}`

```javascript
{
  messageId: "string (auto-generated)",
  chatId: "string",
  senderId: "string (reference to users)",
  
  // Content
  content: "string (optional)",
  type: "enum (text/image/voice/location/document)",
  mediaUrl: "string (for images/voice/documents)",
  
  // Location (if type is location)
  locationData: {
    latitude: "number",
    longitude: "number",
    address: "string"
  },
  
  // Status
  isRead: "boolean",
  readAt: "timestamp (optional)",
  isEdited: "boolean",
  editedAt: "timestamp (optional)",
  
  // Reactions
  reactions: "map of { emoji: count }",
  
  // Timestamps
  timestamp: "timestamp",
  sentAt: "timestamp"
}
```

---

### 8. Notifications Collection

**Collection Path:** `/notifications/{notificationId}`

```javascript
{
  notificationId: "string (auto-generated)",
  userId: "string (recipient)",
  
  // Content
  title: "string",
  message: "string",
  type: "enum (like/comment/follow/message/order/alert)",
  icon: "string (emoji or icon name)",
  
  // Related Content
  relatedId: "string (postId/userId/orderId/etc)",
  relatedType: "enum (post/user/order/community)",
  actionUrl: "string (deep link to content)",
  
  // Status
  isRead: "boolean",
  readAt: "timestamp (optional)",
  isArchived: "boolean",
  
  // Timestamps
  createdAt: "timestamp"
}
```

---

### 9. Transactions Collection

**Collection Path:** `/transactions/{transactionId}`

```javascript
{
  transactionId: "string (auto-generated)",
  
  // Parties
  buyerId: "string (reference to users)",
  sellerId: "string (reference to users)",
  
  // Product/Service
  itemId: "string (reference to marketplace/service)",
  itemType: "enum (product/service)",
  itemTitle: "string",
  
  // Amount
  amount: "number",
  currency: "string",
  
  // Payment
  paymentMethod: "enum (upi/card/wallet)",
  razorpayOrderId: "string",
  razorpayPaymentId: "string (optional)",
  
  // Delivery/Pickup
  deliveryType: "enum (pickup/delivery/handoff)",
  pickupLocation: "string",
  deliveryAddress: "string (if delivery)",
  
  // Status
  status: "enum (pending/completed/failed/refunded)",
  paymentStatus: "enum (pending/success/failed)",
  
  // Review
  reviewed: "boolean",
  buyerRating: "number (1-5, optional)",
  buyerReview: "string (optional)",
  sellerRating: "number (1-5, optional)",
  sellerReview: "string (optional)",
  
  // Timestamps
  createdAt: "timestamp",
  completedAt: "timestamp (optional)",
  reviewedAt: "timestamp (optional)"
}
```

---

## 📈 Analytics Collections (PostgreSQL)

For scalable analytics and reporting:

```sql
-- User Analytics
CREATE TABLE user_analytics (
  id UUID PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  daily_active BOOLEAN,
  posts_created INT,
  marketplace_purchases INT,
  marketplace_sales INT,
  date DATE,
  created_at TIMESTAMP
);

-- App Analytics
CREATE TABLE app_analytics (
  id UUID PRIMARY KEY,
  total_users INT,
  daily_active_users INT,
  total_posts INT,
  total_products INT,
  total_services INT,
  total_transactions DECIMAL,
  date DATE,
  created_at TIMESTAMP
);

-- Business Analytics
CREATE TABLE business_analytics (
  id UUID PRIMARY KEY,
  business_id VARCHAR NOT NULL,
  monthly_views INT,
  monthly_clicks INT,
  monthly_messages INT,
  month DATE,
  created_at TIMESTAMP
);
```

---

## 🔐 Firebase Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection
    match /users/{userId} {
      allow read: if request.auth.uid == userId || request.auth.uid != null;
      allow write: if request.auth.uid == userId;
      allow delete: if request.auth.uid == userId;
    }
    
    // Posts collection
    match /posts/{postId} {
      allow read: if request.auth.uid != null;
      allow create: if request.auth.uid == request.resource.data.authorId;
      allow update, delete: if request.auth.uid == resource.data.authorId;
    }
    
    // Marketplace
    match /marketplace/{productId} {
      allow read: if request.auth.uid != null;
      allow create: if request.auth.uid == request.resource.data.sellerId;
      allow update, delete: if request.auth.uid == resource.data.sellerId;
    }
    
    // Chats
    match /chats/{chatId} {
      allow read: if request.auth.uid in resource.data.participants;
      allow create: if request.auth.uid in request.resource.data.participants;
      
      match /messages/{messageId} {
        allow read: if request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
        allow create: if request.auth.uid == request.resource.data.senderId;
      }
    }
  }
}
```

---

*Last Updated: May 22, 2026*
