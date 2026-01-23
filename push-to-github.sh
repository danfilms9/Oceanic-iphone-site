#!/bin/bash

# Script to push code to GitHub
# Usage: ./push-to-github.sh YOUR_GITHUB_USERNAME YOUR_REPO_NAME

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: ./push-to-github.sh YOUR_GITHUB_USERNAME YOUR_REPO_NAME"
  echo "Example: ./push-to-github.sh danielcarrai holdme-visualizer"
  exit 1
fi

GITHUB_USERNAME=$1
REPO_NAME=$2

echo "🚀 Setting up GitHub remote and pushing code..."
echo "Repository: https://github.com/$GITHUB_USERNAME/$REPO_NAME"

# Check if remote already exists
if git remote get-url origin > /dev/null 2>&1; then
  echo "⚠️  Remote 'origin' already exists. Updating..."
  git remote set-url origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
else
  echo "➕ Adding remote 'origin'..."
  git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
fi

# Set main branch
git branch -M main

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
  echo "✅ Successfully pushed to GitHub!"
  echo "🌐 Repository URL: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
  echo ""
  echo "Next steps:"
  echo "1. Go to https://vercel.com/new"
  echo "2. Import your repository: $GITHUB_USERNAME/$REPO_NAME"
  echo "3. Follow the instructions in VERCEL_DEPLOYMENT.md"
else
  echo "❌ Failed to push. Make sure:"
  echo "   - You've created the repository on GitHub"
  echo "   - You have the correct permissions"
  echo "   - Your GitHub credentials are configured"
fi
