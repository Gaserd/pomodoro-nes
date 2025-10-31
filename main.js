const { app, BrowserWindow, ipcMain } = require('electron');
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
      sandbox: false
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


