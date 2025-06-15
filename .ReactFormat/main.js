const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Advanced Dithering Tool - React',
    show: false,
    backgroundColor: '#4a4a4a'
  });

  if (isDev) {
    // Load from Vite dev server
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Load from built files
    mainWindow.loadFile(path.join(__dirname, 'dist', 'renderer', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for secure communication
ipcMain.handle('file:open', async () => {
  try {
    const result = await dialog.showOpenDialog({
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] }
      ],
      properties: ['openFile']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    const buffer = await fs.readFile(filePath);
    return { filePath, buffer };
  } catch (error) {
    console.error('Error opening file:', error);
    return null;
  }
});

ipcMain.handle('file:save', async (event, data, suggestedName = 'dithered-image.png') => {
  try {
    const result = await dialog.showSaveDialog({
      defaultPath: suggestedName,
      filters: [
        { name: 'PNG Images', extensions: ['png'] },
        { name: 'JPEG Images', extensions: ['jpg', 'jpeg'] },
        { name: 'WebP Images', extensions: ['webp'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    await fs.writeFile(result.filePath, data);
    return result.filePath;
  } catch (error) {
    console.error('Error saving file:', error);
    return null;
  }
});

ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('dialog:showError', async (event, title, content) => {
  await dialog.showErrorBox(title, content);
});

// Image processing handler (placeholder for now)
ipcMain.handle('image:process', async (event, imageData, algorithm, params) => {
  // TODO: Implement image processing
  console.log('Image processing requested:', algorithm, params);
  return imageData;
});