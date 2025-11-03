const { app, BrowserWindow, ipcMain, nativeImage, powerSaveBlocker } = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * Creates the main application window.
 */
function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 720,
    minHeight: 480,
    icon: path.join(__dirname, 'icon.png'),
    frame: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // mainWindow.webContents.openDevTools({ mode: 'detach' });
}

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// --- stats storage ---
function getStatsFilePath() {
  const dir = app.getPath('userData');
  return path.join(dir, 'coins.json');
}

function readStats() {
  try {
    const p = getStatsFilePath();
    if (!fs.existsSync(p)) return {};
    const raw = fs.readFileSync(p, 'utf-8');
    const json = JSON.parse(raw);
    return typeof json === 'object' && json ? json : {};
  } catch (_) {
    return {};
  }
}

function writeStats(obj) {
  try {
    const p = getStatsFilePath();
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf-8');
    return true;
  } catch (_) {
    return false;
  }
}

function todayKey() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

ipcMain.handle('stats:loadToday', async () => {
  const all = readStats();
  const key = todayKey();
  return Number(all[key] || 0);
});

ipcMain.handle('stats:setToday', async (_e, count) => {
  const all = readStats();
  const key = todayKey();
  all[key] = Math.max(0, Number(count) || 0);
  writeStats(all);
  return all[key];
});

ipcMain.handle('stats:incrementToday', async (_e, delta) => {
  const all = readStats();
  const key = todayKey();
  const next = (Number(all[key] || 0) + (Number(delta) || 1));
  all[key] = Math.max(0, next);
  writeStats(all);
  return all[key];
});

ipcMain.handle('stats:getLastDays', async (_e, days = 30) => {
  const n = Math.max(1, Math.min(365, Number(days) || 30));
  const all = readStats();
  const out = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    const di = new Date(d);
    di.setDate(d.getDate() - (n - 1 - i));
    const mm = String(di.getMonth() + 1).padStart(2, '0');
    const dd = String(di.getDate()).padStart(2, '0');
    const key = `${di.getFullYear()}-${mm}-${dd}`;
    out.push({ date: key, count: Number(all[key] || 0) });
  }
  return out; // array of { date: YYYY-MM-DD, count: number }
});

ipcMain.handle('stats:getMonth', async (_e, year, month /* 1-12 */) => {
  const y = Number(year);
  const m = Number(month);
  if (!y || !m) return [];
  const all = readStats();
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0); // last day of month
  const daysInMonth = last.getDate();
  const pad = (n) => String(n).padStart(2, '0');
  const rows = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${y}-${pad(m)}-${pad(day)}`;
    rows.push({ date: key, count: Number(all[key] || 0) });
  }
  return rows;
});

ipcMain.handle('app:close', async () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.close();
  return true;
});

ipcMain.handle('app:minimize', async () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.minimize();
  return true;
});

// Overlay icon (Windows taskbar) for timer
ipcMain.handle('app:setOverlayIcon', async (_e, dataUrl, description = '') => {
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  if (!win || !dataUrl) return false;
  try {
    // accept data URL or base64 string
    const base64 = String(dataUrl).startsWith('data:') ? String(dataUrl).split(',')[1] : String(dataUrl);
    const img = nativeImage.createFromBuffer(Buffer.from(base64, 'base64'));
    win.setOverlayIcon(img, description || 'Timer');
    return true;
  } catch (_) {
    return false;
  }
});

ipcMain.handle('app:clearOverlayIcon', async () => {
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  if (!win) return false;
  try { win.setOverlayIcon(null, ''); return true; } catch (_) { return false; }
});

// Power save blocker to keep timers accurate when minimized
let psbId = null;
ipcMain.handle('app:powerSave', async (_e, enable) => {
  const on = !!enable;
  try {
    if (on) {
      if (psbId == null || !powerSaveBlocker.isStarted(psbId)) {
        psbId = powerSaveBlocker.start('prevent-app-suspension');
      }
      return true;
    } else {
      if (psbId != null && powerSaveBlocker.isStarted(psbId)) {
        powerSaveBlocker.stop(psbId);
      }
      psbId = null;
      return true;
    }
  } catch (_) {
    return false;
  }
});

// --- daily tasks (To-Do) ---
function readTasksAll() {
  const all = readStats();
  const tasks = (all && typeof all === 'object' ? all._tasks : null);
  return tasks && typeof tasks === 'object' ? tasks : {};
}

function writeTasksAll(tasksByDate) {
  const all = readStats();
  const out = { ...all, _tasks: tasksByDate };
  writeStats(out);
}

function generateTaskId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

ipcMain.handle('tasks:loadToday', async () => {
  const key = todayKey();
  const tasksAll = readTasksAll();
  return Array.isArray(tasksAll[key]) ? tasksAll[key] : [];
});

ipcMain.handle('tasks:add', async (_e, text) => {
  const key = todayKey();
  const tasksAll = readTasksAll();
  const list = Array.isArray(tasksAll[key]) ? tasksAll[key] : [];
  const trimmed = String(text || '').trim();
  if (!trimmed) return list;
  const next = [...list, { id: generateTaskId(), text: trimmed, done: false }];
  tasksAll[key] = next;
  writeTasksAll(tasksAll);
  return next;
});

ipcMain.handle('tasks:toggle', async (_e, id) => {
  const key = todayKey();
  const tasksAll = readTasksAll();
  const list = Array.isArray(tasksAll[key]) ? tasksAll[key] : [];
  const next = list.map((t) => t && t.id === id ? { ...t, done: !t.done } : t);
  tasksAll[key] = next;
  writeTasksAll(tasksAll);
  return next;
});

ipcMain.handle('tasks:remove', async (_e, id) => {
  const key = todayKey();
  const tasksAll = readTasksAll();
  const list = Array.isArray(tasksAll[key]) ? tasksAll[key] : [];
  const next = list.filter((t) => t && t.id !== id);
  tasksAll[key] = next;
  writeTasksAll(tasksAll);
  return next;
});

ipcMain.handle('tasks:clearCompleted', async () => {
  const key = todayKey();
  const tasksAll = readTasksAll();
  const list = Array.isArray(tasksAll[key]) ? tasksAll[key] : [];
  const next = list.filter((t) => t && !t.done);
  tasksAll[key] = next;
  writeTasksAll(tasksAll);
  return next;
});


