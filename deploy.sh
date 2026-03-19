#!/bin/bash

PROJECT_ID="gwx-internship-01"
REGION="us-east1"
SERVICE_NAME="keboli-frontend"
GAR_REPO="us-east1-docker.pkg.dev/$PROJECT_ID/gwx-gar-intern-01"
IMAGE="$GAR_REPO/frontend:latest"

echo "Fetching Backend URL..."
BACKEND_URL=$(gcloud run services describe keboli-backend --region=$REGION --format='value(status.url)' --project=$PROJECT_ID)
echo "Backend URL: $BACKEND_URL"

FULL_BACKEND_URL="${BACKEND_URL}/api"
echo "Full Backend URL: $FULL_BACKEND_URL"
echo "Building Frontend with Backend URL: $FULL_BACKEND_URL"
docker build --build-arg VITE_API_URL=$FULL_BACKEND_URL -t $IMAGE .
docker push $IMAGE

echo "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image=$IMAGE \
  --region=$REGION \
  --allow-unauthenticated \
  --project=$PROJECT_ID \
  --platform=managed \
  --port=80 \
  --max-instances=2 \
  --min-instances=0 \
  --min=0 \
  --max=2 \
  --service-account gwx-cloudrun-sa-01@gwx-internship-01.iam.gserviceaccount.com 

echo "Frontend is live!"