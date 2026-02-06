#!/bin/bash

# ============================================
# Move Punch Card Bot to Separate Folder
# ============================================
# This script moves all Punch Card Bot files to
# a new folder on your Desktop
# ============================================

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Moving Punch Card Bot to Separate Folder"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Current location
CURRENT_DIR="/Users/kyawlaymyint/Desktop/CoinCapTrading/Punch Card bot"

# New location
NEW_DIR="/Users/kyawlaymyint/Desktop/Punch-Card-Bot"

echo "📂 Current location:"
echo "   $CURRENT_DIR"
echo ""
echo "📂 New location:"
echo "   $NEW_DIR"
echo ""

# Create new directory
echo "1. Creating new directory..."
mkdir -p "$NEW_DIR"
echo "   ✅ Created: $NEW_DIR"
echo ""

# Copy all files (including hidden files)
echo "2. Copying files..."
cd "$CURRENT_DIR"

# Count files
TOTAL_FILES=$(ls -A | wc -l | tr -d ' ')
echo "   Found $TOTAL_FILES files/folders to copy"
echo ""

# Copy visible files
cp -r * "$NEW_DIR/" 2>/dev/null || true

# Copy hidden files (exclude . and ..)
for file in .??*; do
    if [ -e "$file" ] && [ "$file" != ".DS_Store" ]; then
        cp -r "$file" "$NEW_DIR/" 2>/dev/null || true
    fi
done

echo "   ✅ Files copied"
echo ""

# Verify new location
echo "3. Verifying new location..."
cd "$NEW_DIR"
NEW_TOTAL=$(ls -A | wc -l | tr -d ' ')
echo "   Files in new location: $NEW_TOTAL"
echo ""

# Show important files
echo "4. Important files in new location:"
echo ""
echo "   📄 Code files:"
ls -lh *.js 2>/dev/null | awk '{print "      " $9 " - " $5}' | head -5
echo ""
echo "   📖 Documentation:"
ls -1 *.md 2>/dev/null | head -5 | awk '{print "      " $0}'
echo ""
echo "   ⚙️ Config files:"
ls -la .clasp* .git* 2>/dev/null | tail -n +2 | awk '{print "      " $9 " - " $5}'
echo ""

# Ask about removing old location
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ COPY COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📂 Punch Card Bot is now at:"
echo "   $NEW_DIR"
echo ""
read -p "🗑️  Remove old location? (y/n): " REMOVE_OLD

if [ "$REMOVE_OLD" = "y" ]; then
    echo ""
    echo "Removing old location..."
    rm -rf "$CURRENT_DIR"
    echo "✅ Old location removed"
else
    echo ""
    echo "⚠️  Old location kept at:"
    echo "   $CURRENT_DIR"
    echo ""
    echo "💡 You can manually remove it later if needed"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Done!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📂 Your Punch Card Bot is now at:"
echo "   $NEW_DIR"
echo ""
echo "🔄 Next steps:"
echo "   1. cd \"$NEW_DIR\""
echo "   2. Verify files: ls -la"
echo "   3. Continue with auto-deployment setup"
echo ""
