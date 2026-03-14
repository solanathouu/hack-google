#!/bin/bash
set -e

# Install Python deps
cd backend
pip install -q -r requirements.txt 2>/dev/null

# Build frontend
cd ../frontend
npm install --silent 2>/dev/null
npx vite build --outDir ../backend/static 2>/dev/null
echo "Frontend built."

# Start backend (serves API + static frontend)
cd ../backend
exec uvicorn main:app --host 0.0.0.0 --port 8000
