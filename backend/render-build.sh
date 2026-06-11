#!/usr/bin/env bash
set -e

echo "Installing all dependencies including dev..."
npm install

echo "Building TypeScript..."
npm run build

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Seeding database..."
npm run db:seed

echo "Build complete."
