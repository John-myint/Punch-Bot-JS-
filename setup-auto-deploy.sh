#!/bin/bash

# ============================================
# Quick Setup Script for Auto-Deployment
# ============================================
# Run this script once to set up GitHub Actions deployment
# Usage: bash setup-auto-deploy.sh

set -e  # Exit on error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Auto-Deployment Setup for Google Apps Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Check if clasp is installed
echo "📦 Step 1: Checking clasp installation..."
if ! command -v clasp &> /dev/null; then
    echo "❌ clasp not found. Installing..."
    npm install -g @google/clasp
    echo "✅ clasp installed successfully!"
else
    echo "✅ clasp already installed: $(clasp --version)"
fi
echo ""

# Step 2: Check if logged in
echo "🔐 Step 2: Checking clasp login status..."
if [ ! -f ~/.clasprc.json ]; then
    echo "⚠️ Not logged in to clasp."
    echo "Please run: clasp login"
    echo "Then run this script again."
    exit 1
else
    echo "✅ Already logged in to clasp"
fi
echo ""

# Step 3: Verify .clasp.json
echo "⚙️ Step 3: Verifying project configuration..."
if [ ! -f .clasp.json ]; then
    echo "❌ .clasp.json not found!"
    echo "Creating .clasp.json..."
    read -p "Enter your Apps Script ID: " SCRIPT_ID
    echo "{\"scriptId\":\"$SCRIPT_ID\",\"rootDir\":\".\"}" > .clasp.json
    echo "✅ .clasp.json created"
else
    echo "✅ .clasp.json found"
    cat .clasp.json
fi
echo ""

# Step 4: Test manual deployment
echo "🧪 Step 4: Testing manual deployment..."
read -p "Test deployment now? (y/n): " TEST_DEPLOY
if [ "$TEST_DEPLOY" = "y" ]; then
    echo "Deploying..."
    clasp push --force
    echo "✅ Manual deployment successful!"
else
    echo "⏭️ Skipping test deployment"
fi
echo ""

# Step 5: Get credentials for GitHub
echo "🔑 Step 5: Getting credentials for GitHub..."
echo ""
echo "Copy the content of ~/.clasprc.json and add it as a GitHub secret:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat ~/.clasprc.json
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 6: Instructions for GitHub
echo "📋 Step 6: GitHub Secrets Setup"
echo ""
echo "Go to your GitHub repository:"
echo "Settings → Secrets and variables → Actions → New repository secret"
echo ""
echo "Add these secrets:"
echo ""
echo "1. Name: CLASP_TOKEN"
echo "   Value: (paste the JSON content above)"
echo ""
echo "2. Name: SCRIPT_ID"
SCRIPT_ID=$(grep scriptId .clasp.json | cut -d'"' -f4)
echo "   Value: $SCRIPT_ID"
echo ""

# Step 7: Initialize git if needed
echo "📝 Step 7: Git repository check..."
if [ ! -d .git ]; then
    echo "⚠️ Git repository not initialized"
    read -p "Initialize git repository? (y/n): " INIT_GIT
    if [ "$INIT_GIT" = "y" ]; then
        git init
        git checkout -b main
        echo "✅ Git repository initialized"
    fi
else
    echo "✅ Git repository already initialized"
fi
echo ""

# Step 8: Final checklist
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SETUP COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. ✅ clasp installed and logged in"
echo "2. ✅ .clasp.json configured"
echo "3. ✅ .claspignore created"
echo "4. ✅ .gitignore updated"
echo "5. ✅ GitHub Actions workflow created"
echo ""
echo "🔴 TODO (Manual steps):"
echo ""
echo "1. Add GitHub secrets (instructions above)"
echo "2. Push to GitHub:"
echo "   git add ."
echo "   git commit -m 'feat: add auto-deployment'"
echo "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
echo "   git push -u origin main"
echo ""
echo "3. Watch deployment:"
echo "   https://github.com/YOUR_USERNAME/YOUR_REPO/actions"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 After setup, just 'git push' to auto-deploy!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
