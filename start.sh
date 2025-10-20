#!/bin/bash

echo "🚀 Starting ADIYOGI - Information Gathering Platform"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
fi

# Create necessary directories
mkdir -p output/{results,logs,reports}
mkdir -p tools/{wordlists,scripts}

echo "📁 Directory structure verified"
echo "🔧 Starting server..."

# Start the server
npm start
