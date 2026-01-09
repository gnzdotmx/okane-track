#!/bin/sh
set -e

echo "Starting OkaneTrack Backend..."

# Wait for database to be ready
echo "Waiting for database..."
sleep 5

# Push database schema (creates tables if they don't exist)
echo "Pushing database schema..."
prisma db push

# Run seed (if needed)
echo "Seeding database..."
node dist/prisma/seed.js || echo "Seed already completed or skipped"

# Start application
echo "Starting application..."
exec npm start

