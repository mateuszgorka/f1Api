#!/bin/bash

# Clear FastF1 cache on startup
echo "🧹 Clearing FastF1 cache..."
if [ -d "cache" ]; then
    rm -rf cache/*
    echo "✅ Cache cleared"
else
    mkdir -p cache
    echo "✅ Cache directory created"
fi

# Start FastAPI application
echo "🚀 Starting F1 API Assistant Pro..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
