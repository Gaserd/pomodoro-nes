const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('stats', {
  loadToday: () => ipcRenderer.invoke('stats:loadToday'),
  setToday: (count) => ipcRenderer.invoke('stats:setToday', count),
  incrementToday: (delta = 1) => ipcRenderer.invoke('stats:incrementToday', delta),
  getLastDays: (days = 30) => ipcRenderer.invoke('stats:getLastDays', days),
  getMonth: (year, month) => ipcRenderer.invoke('stats:getMonth', year, month),
});

contextBridge.exposeInMainWorld('tasks', {
  loadToday: () => ipcRenderer.invoke('tasks:loadToday'),
  add: (text) => ipcRenderer.invoke('tasks:add', text),
  toggle: (id) => ipcRenderer.invoke('tasks:toggle', id),
  remove: (id) => ipcRenderer.invoke('tasks:remove', id),
  clearCompleted: () => ipcRenderer.invoke('tasks:clearCompleted'),
});

contextBridge.exposeInMainWorld('windowControls', {
  close: () => ipcRenderer.invoke('app:close'),
  minimize: () => ipcRenderer.invoke('app:minimize'),
});

contextBridge.exposeInMainWorld('overlay', {
  set: (dataUrl, description) => ipcRenderer.invoke('app:setOverlayIcon', dataUrl, description),
  clear: () => ipcRenderer.invoke('app:clearOverlayIcon'),
});

contextBridge.exposeInMainWorld('powerSave', {
  enable: () => ipcRenderer.invoke('app:powerSave', true),
  disable: () => ipcRenderer.invoke('app:powerSave', false),
});

window.addEventListener('DOMContentLoaded', () => {
  // no-op
});


