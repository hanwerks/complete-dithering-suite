#!/bin/bash

# Professional Dithering Tool - Project Setup Script
# Run this in your WSL Ubuntu environment

set -e

echo "🚀 Setting up Professional Dithering Tool development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -d ".git" ]; then
    print_error "Not in a git repository. Please run this from your repo root."
    exit 1
fi

print_status "Creating project structure..."

# Create main directory structure
mkdir -p src/{main,renderer,shared,assets}
mkdir -p src/renderer/{components,engine,stores,utils,styles}
mkdir -p src/renderer/components/{workspace,panels,preview,modals,menu,status}
mkdir -p src/renderer/engine/{algorithms,workers,wasm,gpu}
mkdir -p src/assets/{icons,presets,samples}
mkdir -p native/{cpp,rust}
mkdir -p build/{icons,installer,notarization}
mkdir -p dist
mkdir -p docs

print_success "Directory structure created"

# Create package.json
print_status "Creating package.json..."

cat > package.json << 'EOF'
{
  "name": "professional-dithering-tool",
  "version": "0.1.0",
  "description": "Professional-grade image dithering tool with advanced algorithms and real-time processing",
  "main": "dist/main/main.js",
  "author": "Your Name",
  "license": "MIT",
  "homepage": "https://github.com/yourusername/dithering-tool",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/dithering-tool.git"
  },
  "scripts": {
    "dev": "concurrently \"npm run dev:renderer\" \"npm run dev:main\"",
    "dev:renderer": "vite",
    "dev:main": "tsc -p tsconfig.main.json && electron dist/main/main.js",
    "build": "npm run build:renderer && npm run build:main",
    "build:renderer": "vite build",
    "build:main": "tsc -p tsconfig.main.json",
    "build:wasm": "emcc native/cpp/dithering.cpp -o src/renderer/engine/wasm/dithering.wasm",
    "dist": "electron-builder",
    "dist:all": "electron-builder --mac --windows --linux",
    "dist:dir": "electron-builder --dir",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "type-check": "tsc --noEmit",
    "postinstall": "electron-builder install-app-deps"
  },
  "dependencies": {
    "electron": "^27.0.0",
    "electron-updater": "^6.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "sharp": "^0.32.0",
    "sqlite3": "^5.1.0",
    "zustand": "^4.4.0",
    "framer-motion": "^10.16.0",
    "react-hotkeys-hook": "^4.4.0",
    "file-saver": "^2.0.5",
    "jszip": "^3.10.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/node": "^20.5.0",
    "@types/file-saver": "^2.0.5",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.4.0",
    "concurrently": "^8.2.0",
    "electron-builder": "^24.6.0",
    "eslint": "^8.45.0",
    "eslint-plugin-react": "^7.33.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "jest": "^29.6.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.3.0",
    "typescript": "^5.1.0",
    "vite": "^4.4.0",
    "vite-plugin-electron": "^0.14.0"
  },
  "build": {
    "appId": "com.yourcompany.dithering-tool",
    "productName": "Professional Dithering Tool",
    "copyright": "Copyright © 2024 Your Company",
    "directories": {
      "output": "dist",
      "buildResources": "build"
    },
    "files": [
      "dist/**/*",
      "assets/**/*",
      "!src/**/*",
      "!native/**/*",
      "!docs/**/*"
    ],
    "extraResources": [
      {
        "from": "assets/",
        "to": "assets/"
      }
    ],
    "mac": {
      "category": "public.app-category.graphics-design",
      "target": {
        "target": "dmg",
        "arch": ["x64", "arm64"]
      },
      "icon": "build/icons/icon.icns"
    },
    "win": {
      "target": {
        "target": "nsis",
        "arch": ["x64"]
      },
      "icon": "build/icons/icon.ico"
    },
    "linux": {
      "target": [
        {
          "target": "AppImage",
          "arch": ["x64"]
        },
        {
          "target": "deb",
          "arch": ["x64"]
        }
      ],
      "icon": "build/icons/icon.png",
      "category": "Graphics"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
EOF

print_success "package.json created"

# Create TypeScript configurations
print_status "Creating TypeScript configurations..."

# Main process tsconfig
cat > tsconfig.main.json << 'EOF'
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "dist/main",
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "lib": ["ES2020"]
  },
  "include": ["src/main/**/*", "src/shared/**/*"],
  "exclude": ["src/renderer/**/*"]
}
EOF

# Renderer process tsconfig
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["DOM", "DOM.Iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "module": "ESNext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/renderer/*"],
      "@shared/*": ["src/shared/*"],
      "@main/*": ["src/main/*"]
    }
  },
  "include": [
    "src/renderer/**/*",
    "src/shared/**/*"
  ],
  "exclude": [
    "src/main/**/*"
  ]
}
EOF

print_success "TypeScript configurations created"

# Create Vite configuration
print_status "Creating Vite configuration..."

cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      external: ['electron']
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@main': resolve(__dirname, 'src/main')
    }
  },
  server: {
    port: 3000
  }
});
EOF

print_success "Vite configuration created"

# Create Tailwind configuration
print_status "Creating Tailwind CSS configuration..."

cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        secondary: {
          50: '#fdf4ff',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed',
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
      }
    },
  },
  plugins: [],
}
EOF

print_success "Tailwind configuration created"

# Create initial source files
print_status "Creating initial source files..."

# Main process entry point
cat > src/main/main.ts << 'EOF'
import { app, BrowserWindow, Menu } from 'electron';
import * as path from 'path';

class DitheringApp {
    private mainWindow: BrowserWindow | null = null;

    constructor() {
        this.init();
    }

    private async init() {
        await app.whenReady();
        this.createWindow();
        this.setupMenu();
        
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                this.createWindow();
            }
        });

        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });
    }

    private createWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            minWidth: 1000,
            minHeight: 700,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js'),
            },
            titleBarStyle: 'hiddenInset',
            show: false,
        });

        // Load the app
        if (process.env.NODE_ENV === 'development') {
            this.mainWindow.loadURL('http://localhost:3000');
            this.mainWindow.webContents.openDevTools();
        } else {
            this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
        }

        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow?.show();
        });

        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });
    }

    private setupMenu() {
        const template: Electron.MenuItemConstructorOptions[] = [
            {
                label: 'File',
                submenu: [
                    {
                        label: 'Open Image...',
                        accelerator: 'CmdOrCtrl+O',
                        click: () => {
                            // TODO: Implement file opening
                        }
                    },
                    {
                        label: 'Save As...',
                        accelerator: 'CmdOrCtrl+S',
                        click: () => {
                            // TODO: Implement file saving
                        }
                    },
                    { type: 'separator' },
                    {
                        label: 'Quit',
                        accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                        click: () => {
                            app.quit();
                        }
                    }
                ]
            },
            {
                label: 'Edit',
                submenu: [
                    { role: 'undo' },
                    { role: 'redo' },
                    { type: 'separator' },
                    { role: 'cut' },
                    { role: 'copy' },
                    { role: 'paste' }
                ]
            },
            {
                label: 'View',
                submenu: [
                    { role: 'reload' },
                    { role: 'forceReload' },
                    { role: 'toggleDevTools' },
                    { type: 'separator' },
                    { role: 'resetZoom' },
                    { role: 'zoomIn' },
                    { role: 'zoomOut' },
                    { type: 'separator' },
                    { role: 'togglefullscreen' }
                ]
            }
        ];

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }
}

new DitheringApp();
EOF

# Preload script
cat > src/main/preload.ts << 'EOF'
import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
    saveFileDialog: (defaultName: string) => ipcRenderer.invoke('save-file-dialog', defaultName),
    processImage: (imageData: ArrayBuffer, algorithm: string, parameters: any) =>
        ipcRenderer.invoke('process-image', imageData, algorithm, parameters),
    readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
    writeFile: (filePath: string, data: ArrayBuffer) => ipcRenderer.invoke('write-file', filePath, data),
});

// Type declaration for the exposed API
declare global {
    interface Window {
        electronAPI: {
            openFileDialog: () => Promise<any>;
            saveFileDialog: (defaultName: string) => Promise<any>;
            processImage: (imageData: ArrayBuffer, algorithm: string, parameters: any) => Promise<ArrayBuffer>;
            readFile: (filePath: string) => Promise<ArrayBuffer>;
            writeFile: (filePath: string, data: ArrayBuffer) => Promise<void>;
        };
    }
}
EOF

# React app entry point
cat > src/renderer/main.tsx << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/global.css';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
EOF

# Main App component
cat > src/renderer/App.tsx << 'EOF'
import React from 'react';

export function App() {
    return (
        <div className="app-container h-screen bg-gradient-to-br from-blue-900 to-blue-600 text-white">
            <div className="flex h-full">
                {/* Controls Panel */}
                <div className="w-80 bg-white/10 backdrop-blur-xl border-r border-white/20 p-6">
                    <h2 className="text-xl font-bold mb-4">🎨 Controls</h2>
                    <p className="text-sm text-white/80">
                        Professional Dithering Tool is starting up...
                    </p>
                </div>

                {/* Main Workspace */}
                <div className="flex-1 flex flex-col">
                    {/* Header */}
                    <div className="h-16 bg-white/10 backdrop-blur-xl border-b border-white/20 flex items-center px-6">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                            Professional Dithering Tool
                        </h1>
                    </div>

                    {/* Preview Area */}
                    <div className="flex-1 p-6">
                        <div className="h-full bg-white/5 backdrop-blur-xl rounded-xl border border-white/20 flex items-center justify-center">
                            <div className="text-center">
                                <div className="text-6xl mb-4">🎯</div>
                                <h3 className="text-xl font-semibold mb-2">Ready to Process</h3>
                                <p className="text-white/70">Load an image to begin dithering</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
EOF

# Global CSS
cat > src/renderer/styles/global.css << 'EOF'
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Inter', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    user-select: none;
}

code {
    font-family: 'JetBrains Mono', monospace;
}

/* Custom scrollbar */
::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
}

::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.5);
}

/* Animations */
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from { 
        opacity: 0;
        transform: translateY(20px);
    }
    to { 
        opacity: 1;
        transform: translateY(0);
    }
}

.app-container {
    animation: fadeIn 0.3s ease-in-out;
}
EOF

# HTML template
cat > src/renderer/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Professional Dithering Tool</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #1e3a8a, #3b82f6);
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            flex-direction: column;
        }
        
        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid #fbbf24;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div id="root">
        <div class="loading">
            <div class="spinner"></div>
            <p style="margin-top: 20px;">Loading Professional Dithering Tool...</p>
        </div>
    </div>
    <script type="module" src="./main.tsx"></script>
</body>
</html>
EOF

# Shared types
cat > src/shared/types.ts << 'EOF'
export interface ImageData {
    buffer: ArrayBuffer;
    width: number;
    height: number;
    channels: number;
}

export interface DitheringAlgorithm {
    id: string;
    name: string;
    description: string;
    parameters: AlgorithmParameter[];
}

export interface AlgorithmParameter {
    id: string;
    name: string;
    type: 'number' | 'boolean' | 'select' | 'color';
    min?: number;
    max?: number;
    step?: number;
    default: any;
    options?: { label: string; value: any }[];
}

export interface ProcessingSettings {
    algorithm: string;
    parameters: Record<string, any>;
    outputFormat: 'png' | 'jpeg' | 'webp';
    quality: number;
}

export interface ExportSettings {
    format: 'png' | 'jpeg' | 'webp';
    quality: number;
    width?: number;
    height?: number;
    maintainAspectRatio: boolean;
}
EOF

print_success "Initial source files created"

# Create development configuration files
print_status "Creating development configuration files..."

# ESLint configuration
cat > .eslintrc.js << 'EOF'
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: ['react', '@typescript-eslint'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
EOF

# Git ignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
*.tsbuildinfo

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Electron
out/
app/
release/

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# Native modules
native/build/
*.node

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# WebAssembly builds
*.wasm
EOF

print_success "Configuration files created"

# Create README
print_status "Creating documentation..."

cat > README.md << 'EOF'
# Professional Dithering Tool

A professional-grade desktop application for advanced image dithering with real-time processing, custom algorithms, and batch operations.

## Features

- **Real-time Processing**: See changes instantly as you adjust parameters
- **Advanced Algorithms**: Floyd-Steinberg, Jarvis-Judice-Ninke, Blue Noise, and more
- **Custom Matrix Editor**: Create and modify error diffusion matrices
- **Noise Integration**: Procedural noise generation with frequency control
- **Batch Processing**: Handle multiple images with parallel processing
- **Professional Export**: Multiple formats with optimization
- **Cross-platform**: Windows, macOS, and Linux support

## Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

### Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Create distributable packages
npm run dist
```

### Project Structure

```
src/
├── main/           # Electron main process
├── renderer/       # React frontend
├── shared/         # Shared types and utilities
└── assets/         # Static resources

native/             # Native modules (C++/Rust)
build/              # Build configuration
dist/               # Distribution packages
```

## Scripts

- `npm run dev` - Start development environment
- `npm run build` - Build for production
- `npm run dist` - Create distribution packages
- `npm run test` - Run tests
- `npm run lint` - Lint code

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
EOF

print_success "Documentation created"

# Install dependencies
print_status "Installing dependencies (this may take a few minutes)..."

if npm install; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

print_status "Creating initial git commit..."

# Initial git setup
git add .
git commit -m "Initial project setup

- Electron + React + TypeScript configuration
- Project structure and build system
- Development environment ready
- Basic UI framework with Tailwind CSS"

print_success "🎉 Project setup complete!"

echo ""
echo "===================================================================================="
echo "🚀 PROFESSIONAL DITHERING TOOL - DEVELOPMENT ENVIRONMENT READY!"
echo "===================================================================================="
echo ""
echo "📁 Project Structure Created:"
echo "   ├── src/main/           - Electron backend (Node.js)"
echo "   ├── src/renderer/       - React frontend (TypeScript)"
echo "   ├── src/shared/         - Shared types and utilities"
echo "   ├── native/             - High-performance C++/Rust modules"
echo "   └── build/              - Distribution and packaging"
echo ""
echo "🛠️  Development Commands:"
echo "   npm run dev             - Start development environment"
echo "   npm run build           - Build for production"
echo "   npm run dist            - Create distributable packages"
echo "   npm run test            - Run test suite"
echo "   npm run lint            - Check code quality"
echo ""
echo "🎯 Next Steps:"
echo "   1. Run 'npm run dev' to start the development server"
echo "   2. The app will open automatically in a new window"
echo "   3. Make changes to src/renderer/ for UI updates"
echo "   4. Make changes to src/main/ for backend functionality"
echo ""
echo "📋 Phase 1 Development Tasks (Next 2 weeks):"
echo "   □ Basic image loading and display"
echo "   □ Floyd-Steinberg algorithm implementation"
echo "   □ Real-time preview system"
echo "   □ File save/export functionality"
echo "   □ UI polish and error handling"
echo ""
echo "🔧 Advanced Features (Phase 2):"
echo "   □ JJN matrix editor integration"
echo "   □ Noise generation system"
echo "   □ Batch processing pipeline"
echo "   □ Performance optimization"
echo "   □ Cross-platform distribution"
echo ""
echo "💡 Tips:"
echo "   - Use Ctrl+Shift+I to open DevTools in the Electron app"
echo "   - Hot reload is enabled for both main and renderer processes"
echo "   - Check the console for any build errors or warnings"
echo "   - Refer to docs/ directory for detailed documentation"
echo ""
echo "🌟 Ready to build something amazing!"
echo "===================================================================================="