# Professional Dithering Tool - Claude Code Development Brief

## 🎯 **Project Overview**

We're building a **professional-grade desktop dithering application** using Electron + React + TypeScript. This is a standalone local client that will provide advanced image processing capabilities beyond what's possible in web browsers.

## 🏗️ **Architecture & Technology Stack**

### **Core Technologies**
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Electron 27 + Node.js + Sharp.js for image processing
- **Build System**: Vite + Electron Builder
- **Performance**: Web Workers + WebAssembly (planned)
- **Database**: SQLite for settings and presets
- **Testing**: Jest + React Testing Library

### **Project Structure**
```
src/
├── main/                    # Electron main process (Node.js backend)
│   ├── main.ts             # App entry point & window management
│   ├── preload.ts          # Secure IPC bridge
│   ├── file-handler.ts     # File system operations
│   ├── image-processor.ts  # Native image processing
│   └── menu.ts             # Native application menus
│
├── renderer/               # React frontend application
│   ├── components/         # Reusable UI components
│   │   ├── workspace/      # Main workspace layout
│   │   ├── panels/         # Control panels (algorithms, settings)
│   │   ├── preview/        # Image preview with zoom/pan
│   │   └── modals/         # Dialog boxes and overlays
│   │
│   ├── engine/             # Image processing engine
│   │   ├── algorithms/     # Dithering algorithm implementations
│   │   ├── workers/        # Web Workers for background processing
│   │   ├── wasm/           # WebAssembly modules (future)
│   │   └── gpu/            # WebGL/GPU acceleration (future)
│   │
│   ├── stores/             # State management (Zustand)
│   ├── utils/              # Utility functions
│   └── styles/             # Global CSS and Tailwind config
│
├── shared/                 # Shared types and constants
└── assets/                 # Static resources (icons, samples)
```

## 🚀 **Development Phases**

### **Phase 1: Foundation (Current Priority - 4-6 weeks)**

#### **Week 1: UI-First Architecture (REVISED APPROACH)**
- ✅ Project setup with Electron + React + TypeScript
- ✅ Basic UI layout with Tailwind CSS
- ✅ **COMPLETED - UI Components First**:
  - ✅ **Phase 1A: Component Architecture (Small Chunks)**
    - ✅ Create ImagePreview component with drag-drop placeholder
    - ✅ Build AlgorithmPanel component with controls layout
    - ✅ Build ExportPanel component with comprehensive export options
    - ✅ Implement proper three-panel responsive layout
    - ✅ Add loading states and visual feedback components (LoadingSpinner, ProcessingOverlay, ErrorMessage, SuccessNotification)
    - ✅ Establish glassmorphism design system consistency with design tokens
  
#### **Week 2: Functional Integration**
- ⏳ **CURRENT FOCUS - Phase 1B: Add Functionality to Established UI**:
  - [ ] Image loading via drag-drop and file dialog
  - [ ] Canvas-based image display with zoom/pan
  - [ ] Basic Floyd-Steinberg dithering implementation
  - [ ] Real-time preview updates
  - [ ] File save functionality (PNG export)

#### **Week 3-4: Algorithm Foundation**
- [ ] Floyd-Steinberg with adjustable parameters
- [ ] Jarvis-Judice-Ninke (JJN) implementation
- [ ] Matrix editor for custom error diffusion
- [ ] Algorithm switching with parameter preservation
- [ ] Performance baseline establishment

#### **Week 5-6: UI Polish & Core Features**
- [ ] Settings persistence (SQLite integration)
- [ ] Error handling and user feedback
- [ ] Keyboard shortcuts and menu integration
- [ ] Export options (multiple formats)
- [ ] Basic documentation and help system

### **Phase 2: Advanced Features (4-5 weeks)**
- [ ] Batch processing system
- [ ] Web Workers for background processing
- [ ] Advanced algorithms (Blue Noise, Ordered dithering)
- [ ] Noise generation and integration
- [ ] Performance optimization

### **Phase 3: Distribution (3-4 weeks)**
- [ ] Cross-platform builds
- [ ] Auto-updater implementation
- [ ] Code signing and notarization
- [ ] Installer creation
- [ ] Beta testing and release

## 🎨 **UI/UX Design System**

### **Visual Theme**
- **Color Palette**: Blue gradient backgrounds with glassmorphism effects
- **Typography**: Inter for UI text, JetBrains Mono for code/values
- **Layout**: Three-panel design (controls | preview | properties)
- **Interactions**: Real-time updates, smooth animations, professional feel

### **Key Components to Build**
1. **ImagePreview**: Canvas-based display with zoom/pan functionality
2. **AlgorithmPanel**: Algorithm selection with real-time parameter controls
3. **MatrixEditor**: Interactive grid for editing dithering matrices
4. **FileManager**: Drag-drop loading with batch queue management
5. **ExportDialog**: Multi-format export with quality settings

## 🔧 **Technical Implementation Details**

### **Image Processing Pipeline**
```typescript
// Core image processing flow
ImageFile → Canvas → ImageData → Algorithm → ProcessedData → Export
```

### **State Management Strategy**
- **Zustand** for global app state (lightweight, TypeScript-friendly)
- **Component state** for local UI interactions
- **SQLite** for persistent settings and user preferences

### **Performance Considerations**
- **Chunked Processing**: Handle large images in tiles
- **Web Workers**: Background processing without UI blocking
- **Memory Management**: Efficient ImageData handling
- **Caching**: Store processed results for quick preview

### **Security & IPC**
- **Context Isolation**: Secure renderer ↔ main communication
- **Preload Scripts**: Expose only necessary APIs
- **File Validation**: Sanitize all file inputs
- **No Node.js in Renderer**: Maintain security boundaries

## 📝 **Immediate Development Tasks (REVISED - UI-First)**

### **Phase 1A: UI Components (Small Chunk Development)**
1. **Component Architecture Setup**
   - Create `/src/renderer/components/` structure
   - Build ImagePreview component with drag-drop placeholder
   - Create AlgorithmPanel with controls layout
   - Implement ExportPanel component
   - Add LoadingStates and ErrorMessage components

2. **Layout & Design System**
   - Refactor App.tsx to use proper component structure
   - Establish consistent glassmorphism styling
   - Add responsive three-panel layout
   - Implement hover states and animations

### **Phase 1B: Functional Integration (After UI Complete)**
3. **Image Loading System**
   - Implement file dialog integration
   - Add drag-drop functionality to ImagePreview
   - Create ImageLoader utility with error handling
   - Support for common formats (PNG, JPEG, WebP, GIF)

4. **Processing Pipeline**
   - Canvas display system with zoom/pan
   - Basic Floyd-Steinberg dithering engine
   - Real-time preview updates
   - Export functionality with file dialogs

### **Development Strategy: Small Chunks**
- Build one component at a time
- Test each component in isolation
- Maintain visual consistency throughout
- Focus on user experience before functionality

## 🎯 **Success Metrics**

### **Technical Goals**
- **Performance**: Process 4K images in <2 seconds
- **Memory**: Efficient handling of 50MP+ images
- **Responsiveness**: UI remains smooth during processing
- **Quality**: Professional-grade dithering results

### **User Experience Goals**
- **Intuitive**: Non-experts can create quality results
- **Professional**: Expert users have fine-grained control
- **Reliable**: Zero crashes, robust error handling
- **Fast**: Real-time preview updates as parameters change

## 🛠️ **Development Environment**

### **Available Commands**
```bash
npm run dev          # Start development environment
npm run build        # Build for production
npm run dist         # Create distributable packages
npm run test         # Run test suite
npm run lint         # Check code quality
npm run type-check   # TypeScript validation
```

### **Key Files to Work With**
- `src/renderer/App.tsx` - Main React application
- `src/main/main.ts` - Electron main process
- `src/shared/types.ts` - TypeScript definitions
- `package.json` - Dependencies and scripts

### **Development Tips**
- Hot reload is enabled for both main and renderer
- Use Ctrl+Shift+I to open DevTools in Electron
- Check console for build errors and warnings
- All paths are aliased (`@/` for renderer, `@shared/` for shared)

## 🎨 **Visual Reference**

The UI should follow the glassmorphism design from our previous explorations:
- Semi-transparent panels with backdrop blur
- Gradient backgrounds (blue tones)
- Smooth animations and transitions
- Professional color scheme with yellow/orange accents
- Clean typography and consistent spacing

## 📚 **Resources & Documentation**

### **Key Dependencies**
- **Electron**: Desktop app framework
- **React 18**: UI framework with hooks
- **Sharp.js**: High-performance image processing
- **Tailwind CSS**: Utility-first styling
- **Zustand**: Lightweight state management
- **Framer Motion**: Smooth animations

### **External References**
- [Electron IPC Best Practices](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Canvas ImageData API](https://developer.mozilla.org/en-US/docs/Web/API/ImageData)
- [Dithering Algorithms Reference](https://en.wikipedia.org/wiki/Dither)

---

## 🚀 **Ready to Start!**

The project is fully set up and ready for development. Focus on building the core image loading and basic dithering functionality first, then expand to advanced features. The architecture is designed to be modular and scalable.

**Priority 1**: Get a working image loader and Floyd-Steinberg preview system running.

Let's build something amazing! 🎯