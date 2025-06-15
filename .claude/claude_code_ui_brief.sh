# ===== CLAUDE CODE BRIEF: DITHERING TOOL BASE UI =====
# Ubuntu 20.04 WSL Environment
# Goal: Create ONLY the visual layout structure - no functionality yet

# === PHASE 1: PROJECT INITIALIZATION ===
echo "=== Creating Electron Dithering Tool Base UI ==="

# Initialize new Electron project
claude-code "Create a new Electron project called 'dithering-tool' with the following requirements:

PROJECT SETUP:
- Electron app for Ubuntu 20.04 WSL
- Window size: 1400x900 (minimum 1000x600)
- Title: 'Advanced Dithering Tool'
- No functionality yet - LAYOUT ONLY

VISUAL LAYOUT TARGET:
- 3-panel horizontal layout
- Left panel: 300px wide, orange/amber background (#d97706 to #f59e0b gradient)
- Center panel: flexible width, gray background (#5a5a5a)  
- Right panel: 300px wide, orange/amber background (matching left)
- Dark gray outer background (#4a4a4a)
- NO CONTROLS OR FEATURES - just colored panels with titles

SPECIFIC REQUIREMENTS:
1. Left panel header: 'Parameters' (white text, centered)
2. Center panel header: 'Image Preview' (light gray text, centered)  
3. Right panel header: 'Parameters' (white text, centered)
4. Each panel should have placeholder text only
5. Responsive: panels stack vertically on small screens
6. Professional gradients and styling to match reference image

Please create:
- package.json with Electron dependencies
- main.js (minimal window creation)
- src/renderer/index.html (3-panel layout)
- src/renderer/styles/main.css (all styling)

DO NOT ADD:
- Image processing
- File handling  
- Zoom/pan features
- Parameter controls
- Any interactive elements

Focus ONLY on getting the visual layout to match the reference image exactly."

# === VERIFICATION COMMANDS ===
echo "=== After Claude Code creates the project ==="
echo "Run these commands to verify:"
echo "cd dithering-tool"
echo "npm install"
echo "npm start"
echo ""
echo "Expected result: 3-panel layout matching reference image"

# === PHASE 2: LAYOUT REFINEMENT (if needed) ===
claude-code "If the layout doesn't match exactly, refine the CSS to ensure:

CRITICAL LAYOUT REQUIREMENTS:
- Left and right panels: exactly 300px wide
- Orange/amber gradient: linear-gradient(135deg, #d97706, #f59e0b)
- Center panel: gray background #5a5a5a
- Panel headers: prominent, centered, proper contrast
- Smooth gradients and professional appearance
- Sharp panel borders/separators
- Proper responsive behavior

STYLING DETAILS:
- Use flexbox for main layout
- Headers should be visually distinct
- Padding and spacing should feel balanced
- Typography should be clean and readable
- Colors must match reference image precisely

Only modify CSS - do not add any JavaScript functionality yet."

# === PHASE 3: STRUCTURE VALIDATION ===
claude-code "Add placeholder content structure to visualize the layout:

LEFT PANEL CONTENT:
- Section headers like 'Algorithm Settings', 'Noise Controls', 'Color Palette'
- Placeholder text showing where controls will go
- Visual hierarchy with proper spacing

CENTER PANEL CONTENT:  
- Dashed border area showing where image will display
- 'Upload image here' placeholder text
- Area sized appropriately for image preview

RIGHT PANEL CONTENT:
- Section headers like 'Advanced Options', 'Matrix Editor', 'Output Settings'  
- Placeholder text for future controls
- Matching visual hierarchy to left panel

IMPORTANT: Still NO interactive elements - just styled placeholder content to validate the layout structure."

# === TESTING CHECKLIST ===
echo "=== Manual Testing Checklist ==="
echo "□ Window opens at 1400x900"
echo "□ Left panel: 300px wide, orange gradient"
echo "□ Center panel: flexible width, gray background"  
echo "□ Right panel: 300px wide, orange gradient"
echo "□ Headers clearly visible and centered"
echo "□ Responsive layout works when window resized"
echo "□ Colors match reference image exactly"
echo "□ Professional appearance with good spacing"
echo "□ No console errors"
echo "□ Clean, minimal code structure"

# === SUCCESS CRITERIA ===
echo "=== Success Criteria ==="
echo "✅ Visual layout matches reference image exactly"
echo "✅ Code is clean and well-structured"  
echo "✅ Responsive design works properly"
echo "✅ Ready for feature implementation in next phase"
echo "✅ No functionality beyond basic UI display"

# === NEXT PHASE PREPARATION ===
echo "=== After UI Layout Success ==="
echo "Phase 2 will add: Image preview with zoom/pan"
echo "Phase 3 will add: Parameter controls"
echo "Phase 4 will add: Dithering algorithms"
echo "Phase 5 will add: File operations"

# === TROUBLESHOOTING COMMANDS ===
echo "=== If Issues Occur ==="
echo "Check Electron version: ./node_modules/.bin/electron --version"
echo "Verify WSL display: echo \$DISPLAY"
echo "Test basic Electron: npx electron ."
echo "Check console: Ctrl+Shift+I in Electron window"