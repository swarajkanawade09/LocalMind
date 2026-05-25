# LocalMind API Documentation

## Authentication Endpoints

### Send OTP
```
POST /api/auth/send-otp

Body:
{
  "phoneNumber": "+919876543210"
}

Response:
{
  "success": true,
  "message": "OTP sent successfully",
  "expiresIn": 600
}
```

### Verify OTP & Create Account
```
POST /api/auth/verify-otp

Body:
{
  "phoneNumber": "+919876543210",
  "otp": "123456",
  "firstName": "John",
  "lastName": "Doe",
  "locality": "Bandra, Mumbai"
}

Response:
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "userId": "uuid",
    "token": "jwt_token",
    "isNewUser": true,
    "user": {...}
  }
}
```

## Posts Endpoints

### Get Home Feed
```
GET /api/posts?limit=20&offset=0

Headers:
  Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [...posts],
  "total": 45
}
```

### Create Post
```
POST /api/posts

Headers:
  Authorization: Bearer {token}

Body:
{
  "content": "Looking for gym partner",
  "type": "alert",
  "category": "sports",
  "tags": ["gym", "fitness"],
  "imageUrls": [],
  "visibility": {
    "type": "nearby5km",
    "radius": 5
  }
}

Response:
{
  "success": true,
  "data": {...post_object}
}
```

### Like Post
```
POST /api/posts/{postId}/like

Headers:
  Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Post liked successfully"
}
```

## Marketplace Endpoints

### Get Products
```
GET /api/marketplace?limit=20&category=electronics

Headers:
  Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [...products],
  "total": 120
}
```

### Create Listing
```
POST /api/marketplace

Headers:
  Authorization: Bearer {token}

Body:
{
  "title": "iPhone 13",
  "description": "Good condition",
  "category": "electronics",
  "price": 45000,
  "condition": "good",
  "imageUrls": ["url1", "url2"]
}

Response:
{
  "success": true,
  "data": {...product_object}
}
```

## Chat Endpoints

### Get Conversations
```
GET /api/chat/conversations

Headers:
  Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [...conversations]
}
```

### Send Message
```
POST /api/chat/{chatId}/message

Headers:
  Authorization: Bearer {token}

Body:
{
  "content": "Hi there!",
  "type": "text"
}

Response:
{
  "success": true,
  "data": {...message_object}
}
```

## Payments Endpoints

### Create Order
```
POST /api/payments/create-order

Headers:
  Authorization: Bearer {token}

Body:
{
  "amount": 5000,
  "currency": "INR",
  "description": "Product purchase",
  "transactionId": "txn_id"
}

Response:
{
  "success": true,
  "data": {...razorpay_order}
}
```

### Verify Payment
```
POST /api/payments/verify

Headers:
  Authorization: Bearer {token}

Body:
{
  "razorpay_payment_id": "pay_id",
  "razorpay_order_id": "order_id",
  "razorpay_signature": "signature",
  "transactionId": "txn_id"
}

Response:
{
  "success": true,
  "message": "Payment verified successfully"
}
```

## AI Endpoints

### AI Search
```
POST /api/ai/search

Headers:
  Authorization: Bearer {token}

Body:
{
  "query": "plumber near me",
  "type": "all"
}

Response:
{
  "success": true,
  "data": {
    "posts": [...],
    "products": [...],
    "services": [...]
  }
}
```

### Get Recommendations
```
POST /api/ai/recommendations

Headers:
  Authorization: Bearer {token}

Body:
{
  "type": "all"
}

Response:
{
  "success": true,
  "data": {
    "people": [...],
    "services": [...],
    "products": [...]
  }
}
```

## Communities Endpoints

### Get Communities
```
GET /api/communities?type=society&limit=20

Headers:
  Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [...communities]
}
```

### Create Community
```
POST /api/communities

Headers:
  Authorization: Bearer {token}

Body:
{
  "name": "Lodha Bandra",
  "description": "Society residents",
  "type": "society",
  "privacy": "private"
}

Response:
{
  "success": true,
  "data": {...community_object}
}
```

### Join Community
```
POST /api/communities/{communityId}/join

Headers:
  Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Joined community successfully"
}
```

---

## Error Responses

All endpoints return errors in this format:

```
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error"
}
```

### HTTP Status Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Server Error

---

*Last Updated: May 25, 2026*
