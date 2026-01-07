#!/bin/bash

# Setup script for Chat with Documents RAG application

set -e

echo "🚀 Setting up Chat with Documents RAG Application"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "📝 Creating .env file from .env.example..."
  cp .env.example .env
  echo "⚠️  Please edit .env and add your DATABASE_URL"
  echo ""
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run db:generate

# Run migrations
echo "🗄️  Running database migrations..."
npm run db:migrate

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Create a Supabase project at https://supabase.com"
echo "2. Enable pgvector extension in Supabase Dashboard → Database → Extensions"
echo "3. Get your connection string from Supabase Dashboard → Project Settings → Database"
echo "4. Update .env with your DATABASE_URL"
echo "5. Run migrations: npm run db:migrate"
echo "6. Create the vector index in Supabase SQL Editor (run scripts/setup-db.sql)"
echo "7. Start the development server: npm run dev"
echo ""

