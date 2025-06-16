#!/bin/bash

# Complete Dithering Suite - End Development Session
# Usage: ./end-dev-session.sh [session-summary]

echo "🏁 Complete Dithering Suite - End Development Session"
echo "====================================================="

# Get current date and time
DATE=$(date '+%Y-%m-%d')
TIME=$(date '+%H:%M:%S')
SUMMARY=${1:-"Session completed"}

echo "📅 Date: $DATE"
echo "🕐 End Time: $TIME"
echo "📝 Summary: $SUMMARY"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "main.js" ]; then
    echo "❌ Error: Not in project root directory"
    echo "Please run this script from the complete-dithering-suite directory"
    exit 1
fi

# Show session summary from logger if available
echo "📊 Session Performance Summary:"
echo "-------------------------------"
if [ -f "src/renderer/js/logger.js" ]; then
    echo "✅ Development logging system available"
    echo "   (Check browser console for detailed session metrics)"
else
    echo "⚠️  No logging system found"
fi
echo ""

# Show git status and changes
echo "📈 Git Status & Changes:"
echo "------------------------"
if git status --porcelain | grep -q .; then
    echo "📝 Files changed in this session:"
    git status --porcelain
    echo ""
    
    echo "📊 Change summary:"
    git diff --stat
    echo ""
    
    # Suggest commit if there are changes
    echo "💡 Suggested next steps:"
    echo "   1. Review changes: git diff"
    echo "   2. Stage changes: git add ."
    echo "   3. Commit changes: git commit -m \"$SUMMARY\""
    echo ""
else
    echo "✅ No uncommitted changes"
fi

# Update DEVELOPMENT_LOG.md with session summary
echo "📝 Updating DEVELOPMENT_LOG.md..."
TEMP_LOG=$(mktemp)

# Create session entry
cat >> "$TEMP_LOG" << EOF

---

## $DATE - Session Summary

### Session End: $TIME
**Session Summary:** $SUMMARY

### Tasks Completed This Session
EOF

# Try to extract completed tasks from WORK_SESSION.md if it exists
if [ -f "WORK_SESSION.md" ]; then
    echo "📖 Extracting session progress from WORK_SESSION.md..."
    
    # Look for completed tasks (lines starting with - [x])
    if grep -q "- \[x\]" WORK_SESSION.md; then
        echo "### Completed:" >> "$TEMP_LOG"
        grep "- \[x\]" WORK_SESSION.md >> "$TEMP_LOG"
    fi
    
    # Look for current tasks (lines starting with - [Current])
    if grep -q "🔄 Currently Working On" WORK_SESSION.md; then
        echo "" >> "$TEMP_LOG"
        echo "### Work in Progress:" >> "$TEMP_LOG"
        sed -n '/🔄 Currently Working On/,/⏳ Next Tasks/p' WORK_SESSION.md | grep -v "🔄\|⏳" | grep -v "^$" >> "$TEMP_LOG"
    fi
fi

# Add file changes
if git status --porcelain | grep -q .; then
    echo "" >> "$TEMP_LOG"
    echo "### Files Modified:" >> "$TEMP_LOG"
    git status --porcelain | sed 's/^/- /' >> "$TEMP_LOG"
fi

# Add performance metrics placeholder
cat >> "$TEMP_LOG" << EOF

### Technical Notes
- Session duration: [Check browser console for exact timing]
- Development logging: $([ -f "src/renderer/js/logger.js" ] && echo "Active" || echo "Not available")
- Architecture: Vanilla JavaScript with comprehensive image loading

### Next Session Goals
- [ ] [Set goals for next session]
- [ ] [Continue with priority tasks]

EOF

# Append to development log
if [ -f "DEVELOPMENT_LOG.md" ]; then
    cat "$TEMP_LOG" >> DEVELOPMENT_LOG.md
    rm "$TEMP_LOG"
    echo "✅ Session logged in DEVELOPMENT_LOG.md"
else
    echo "⚠️  DEVELOPMENT_LOG.md not found - creating basic entry"
    echo "# Development Log - Complete Dithering Suite" > DEVELOPMENT_LOG.md
    cat "$TEMP_LOG" >> DEVELOPMENT_LOG.md
    rm "$TEMP_LOG"
fi

# Show project status
echo ""
echo "📊 Current Project Status:"
echo "--------------------------"
echo "Files in project:"
find . -maxdepth 3 -name "*.js" -o -name "*.html" -o -name "*.css" -o -name "*.md" | grep -v node_modules | wc -l | xargs echo "  Source/doc files:"

if [ -f "src/renderer/js/imageLoader.js" ]; then
    LINES=$(wc -l < src/renderer/js/imageLoader.js)
    echo "  Image loader: $LINES lines (✅ Ready)"
fi

if [ -f "src/renderer/js/logger.js" ]; then
    echo "  Development logging: ✅ Integrated"
fi

# Check for dithering algorithms
if grep -q "dither\|floyd" src/renderer/js/*.js 2>/dev/null; then
    echo "  Dithering algorithms: ✅ Implemented"
else
    echo "  Dithering algorithms: ⏳ Next priority"
fi

echo ""

# Show recommended next session goals
echo "🎯 Recommended Next Session Goals:"
echo "----------------------------------"
if ! grep -q "dither\|floyd" src/renderer/js/*.js 2>/dev/null; then
    echo "🔥 HIGH PRIORITY:"
    echo "   1. Implement Floyd-Steinberg dithering algorithm"
    echo "   2. Add parameter controls for dithering"
    echo "   3. Create real-time preview system"
    echo ""
fi

echo "📋 DEVELOPMENT WORKFLOW:"
echo "   1. Run './start-dev-session.sh' to begin next session"
echo "   2. Set specific goals in WORK_SESSION.md"
echo "   3. Track progress throughout the session"
echo "   4. Run './end-dev-session.sh' when done"
echo ""

# Final summary
echo "🎉 Session Complete!"
echo "===================="
echo "📝 Session logged in DEVELOPMENT_LOG.md"
echo "🔄 WORK_SESSION.md ready for next session"
if git status --porcelain | grep -q .; then
    echo "⚠️  Don't forget to commit your changes!"
else
    echo "✅ Repository is clean"
fi
echo ""
echo "Next: ./start-dev-session.sh [session-name]"