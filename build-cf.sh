#!/bin/bash
# Build script for Cloudflare Workers deployment

echo "Building BiteBase Backend for Cloudflare Workers..."

# Copy the worker file to ensure it's available
cp src/worker-simple.js src/worker.js

# Use the Cloudflare-specific package.json
if [ -f "package-cf.json" ]; then
  echo "Using Cloudflare-specific package.json..."
  mv package.json package-full.json
  cp package-cf.json package.json
fi

echo "Build complete!"