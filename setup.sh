#!/bin/bash

# Deathwatch Roller Setup Script
echo "🎲 Setting up Deathwatch Roller..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (v18+) first."
    exit 1
fi

echo "✅ Node.js $(node --version) found"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if PM2 is installed globally
if ! command -v pm2 &> /dev/null; then
    echo "⚠️  PM2 not found. Installing PM2 for production deployment..."
    npm install -g pm2
fi

# Create necessary directories
mkdir -p database/sqlite
mkdir -p public/avatars

# Initialize database (it will be created automatically on first server start)
echo "🗄️  Database will be initialized on first server start"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start development:"
echo "  npm start              # Start React dev server"
echo "  npm run server        # Start backend server (in another terminal)"
echo ""
echo "To start production:"
echo "  npm run build         # Build for production"
echo "  npm run pm2:start     # Start with PM2"
echo ""
echo "Access the application at: http://localhost:3000"
echo "Backend API available at: http://localhost:5000"
