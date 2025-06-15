"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose the API to the renderer process
const electronAPI = {
    openFile: () => electron_1.ipcRenderer.invoke('file:open'),
    saveFile: (data, suggestedName) => electron_1.ipcRenderer.invoke('file:save', data, suggestedName),
    processImage: (imageData, algorithm, params) => electron_1.ipcRenderer.invoke('image:process', imageData, algorithm, params),
    getVersion: () => electron_1.ipcRenderer.invoke('app:getVersion'),
    showErrorDialog: (title, content) => electron_1.ipcRenderer.invoke('dialog:showError', title, content),
};
// Expose the API to the renderer process
electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
