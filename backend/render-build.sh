#!/usr/bin/env bash
set -e

echo "Installing dependencies..."
npm install

echo "Building TypeScript..."
npm run build

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Build complete. Skipping seed on deploy."
