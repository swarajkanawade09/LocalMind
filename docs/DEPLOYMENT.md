# LocalMind - Deployment Guide

## Backend Deployment (Google Cloud Run / Firebase)

### Prerequisites
- Google Cloud Account
- gcloud CLI installed
- Docker (for local testing)

### Environment Setup

1. **Create `.env` file:**
```bash
cp backend/.env.example backend/.env
```

2. **Update with your credentials:**
```bash
# Firebase
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_SERVICE_ACCOUNT_KEY=path/to/serviceAccountKey.json

# APIs
OPENAI_API_KEY=sk-...
TWILIO_ACCOUNT_SID=ACxxxxxx
RAZORPAY_KEY_ID=key_xxxx
```

### Deploy Backend to Cloud Run

```bash
# 1. Build Docker image
cd backend
docker build -t localmind-backend .

# 2. Tag for GCR
docker tag localmind-backend gcr.io/YOUR_PROJECT_ID/localmind-backend:latest

# 3. Push to Google Container Registry
docker push gcr.io/YOUR_PROJECT_ID/localmind-backend:latest

# 4. Deploy to Cloud Run
gcloud run deploy localmind-backend \
  --image gcr.io/YOUR_PROJECT_ID/localmind-backend:latest \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated
```

### Firestore Setup

```bash
# 1. Create Firestore database
gcloud firestore databases create \
  --region=asia-south1 \
  --type=firestore-native

# 2. Create indexes
gcloud firestore indexes create --collection=posts --field=locality,createdAt
```

## Frontend Deployment (Flutter)

### Build for Android

```bash
cd frontend

# Generate keystore
keytool -genkey -v -keystore ~/upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10950 \
  -alias upload

# Build App Bundle
flutter build appbundle --release
```

### Build for iOS

```bash
flutter build ios --release
```

### Deploy to App Stores

- **Google Play:** Upload appbundle-release.aab to Google Play Console
- **Apple App Store:** Upload IPA to App Store Connect

---

*Last Updated: May 22, 2026*
