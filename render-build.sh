#!/usr/bin/env bash
# exit on error
set -o errexit

echo "1. Installing Node dependencies and building frontend..."
cd frontend
npm install
npm run build
cd ..

echo "2. Installing Python dependencies..."
pip install -r requirements.txt

echo "Build complete! Both frontend and backend are ready for production."
