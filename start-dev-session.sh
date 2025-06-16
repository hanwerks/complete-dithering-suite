#!/bin/bash

# Complete Dithering Suite - Development Session Starter
# Usage: ./start-dev-session.sh [session-name]

echo "🎯 Complete Dithering Suite - Development Session"
echo "=================================================="

# Get current date and time
DATE=$(date '+%Y-%m-%d')
TIME=$(date '+%H:%M:%S')
SESSION_NAME=${1:-"Development Session"}

echo "📅 Date: $DATE"
echo "🕐 Time: $TIME"
echo "📝 Session: $SESSION_NAME"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "main.js" ]; then
    echo "❌ Error: Not in project root directory"
    echo "Please run this script from the complete-dithering-suite directory"
    exit 1
fi

# Update WORK_SESSION.md with current session info
echo "📝 Updating WORK_SESSION.md..."
cat > WORK_SESSION.md << EOF
# Active Work Session - Complete Dithering Suite

## Current Session: $DATE - $SESSION_NAME

### Session Start: $TIME
**Session Goal:** [Set your goal for this session]

---

## Session Progress

### ✅ Completed Tasks
- [Add completed tasks here]

### 🔄 Currently Working On
- [Current task]

### ⏳ Next Tasks
- [Next priority tasks]

---

## Technical Discoveries

### Today's Findings
- [Key discoveries and learnings]

### Files Modified This Session
- [List files you've changed]

### Code Quality Observations
- [Notes about code quality, patterns, issues]

---

## Session Notes

### Quick Thoughts
- [Rapid notes and ideas]

### Architecture Decisions
- [Any architectural choices made]

### Performance Notes
- [Performance observations and improvements]

---

## End of Session Checklist
- [ ] Update DEVELOPMENT_LOG.md with session summary
- [ ] Commit changes with meaningful message
- [ ] Set goals for next session
- [ ] Document any architectural decisions made

---

## Quick Reference

### Commands to Run
\`\`\`bash
npm start          # Launch Electron app
npm run dev        # Development mode
git status         # Check changes
git add .          # Stage changes  
git commit -m ""   # Commit with message
\`\`\`

### Key File Locations
- **Main Process:** \`main.js\`
- **Frontend:** \`src/renderer/index.html\`
- **Image Loading:** \`src/renderer/js/imageLoader.js\`
- **Logging:** \`src/renderer/js/logger.js\`
- **Styles:** \`src/renderer/styles/main.css\`
- **Documentation:** \`claude_code_briefing.md\`

### Architecture Notes
- Current implementation is vanilla JS/HTML/CSS
- Comprehensive image loading system already implemented
- Development logging system integrated
- Ready for dithering algorithm implementation
EOF

# Show recent development log entries
echo "📖 Recent Development Log Entries:"
echo "----------------------------------"
if [ -f "DEVELOPMENT_LOG.md" ]; then
    # Show last session info from development log
    tail -20 DEVELOPMENT_LOG.md | head -10
else
    echo "No DEVELOPMENT_LOG.md found - you may want to create one"
fi
echo ""

# Show current git status
echo "📊 Git Status:"
echo "--------------"
git status --porcelain
if [ $? -ne 0 ]; then
    echo "Not a git repository or git not available"
fi
echo ""

# Show project structure overview
echo "📁 Project Structure:"
echo "--------------------"
echo "📂 Root Files:"
ls -la *.md *.js *.json *.sh 2>/dev/null | head -10
echo ""
echo "📂 Source Files:"
find src -name "*.js" -o -name "*.html" -o -name "*.css" 2>/dev/null | head -10
echo ""

# Check if dependencies are installed
echo "🔧 Dependency Check:"
echo "--------------------"
if [ -d "node_modules" ] && [ -f "node_modules/.package-lock.json" ]; then
    echo "✅ Node modules installed"
else
    echo "⚠️  Node modules not found - run 'npm install'"
fi
echo ""

# Show available npm scripts
echo "🚀 Available Commands:"
echo "---------------------"
if [ -f "package.json" ]; then
    echo "Available npm scripts:"
    npm run 2>/dev/null | grep "^  " | head -5
else
    echo "No package.json found"
fi
echo ""

# Show current todo items if they exist
echo "📋 Current Project Status:"
echo "--------------------------"
if [ -f "ARCHITECTURE_ANALYSIS.md" ]; then
    echo "✅ Architecture analysis complete"
fi
if [ -f "DEVELOPMENT_LOG.md" ]; then
    echo "✅ Development logging system ready"
fi
if [ -f "src/renderer/js/logger.js" ]; then
    echo "✅ Logging utilities integrated"
fi
if [ -f "src/renderer/js/imageLoader.js" ]; then
    echo "✅ Image loading system (499 lines) ready"
fi

# Check for dithering algorithms
if grep -q "floyd" src/renderer/js/*.js 2>/dev/null; then
    echo "✅ Dithering algorithms implemented"
else
    echo "⏳ Dithering algorithms - next priority"
fi
echo ""

# Final instructions
echo "🎯 Ready to Start Development!"
echo "==============================" 
echo "1. Set your session goal in WORK_SESSION.md"
echo "2. Run 'npm start' to launch the application"
echo "3. Use 'npm run dev' for development mode with DevTools"
echo "4. Update progress in WORK_SESSION.md throughout the session"
echo "5. Use git commands to track changes"
echo ""
echo "Happy coding! 🚀"