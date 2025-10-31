const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('stats', {
  loadToday: () => ipcRenderer.invoke('stats:loadToday'),
  setToday: (count) => ipcRenderer.invoke('stats:setToday', count),
  incrementToday: (delta = 1) => ipcRenderer.invoke('stats:incrementToday', delta),
  getLastDays: (days = 30) => ipcRenderer.invoke('stats:getLastDays', days),
  getMonth: (year, month) => ipcRenderer.invoke('stats:getMonth', year, month),
});

contextBridge.exposeInMainWorld('windowControls', {
  close: () => ipcRenderer.invoke('app:close'),
});

window.addEventListener('DOMContentLoaded', () => {
  // no-op
});


