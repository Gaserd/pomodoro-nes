const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const skipBtn = document.getElementById('skip-btn');
const resetBtn = document.getElementById('reset-btn');
const modeLabel = document.getElementById('mode-label');
const timeLeftEl = document.getElementById('time-left');
const workMinInput = document.getElementById('work-min');
const breakMinInput = document.getElementById('break-min');
const coinCountEl = document.getElementById('coin-count');
const coinWallEl = document.getElementById('coin-wall');
const closeBtn = document.getElementById('close-btn');
const calendarGrid = document.getElementById('calendar-grid');
const calTitleText = document.getElementById('cal-title-text');
const calPrevBtn = document.getElementById('cal-prev');
const calNextBtn = document.getElementById('cal-next');

let timerId = null;
let remainingSeconds = 25 * 60;
let isRunning = false;
let currentMode = 'work'; // 'work' | 'break'

// sounds
const SOUND_BASE = '../sound';
const CLICK_SOUND_FILES = ['click-menu-app-147357.mp3', 'big-button-129050.mp3'];
const CLICK_SOUND_MAP = {
  start: 'click-menu-app-147357.mp3',
  pause: 'click-menu-app-147357.mp3',
  skip: 'click-menu-app-147357.mp3',
  reset: 'big-button-129050.mp3',
};
const END_SOUND_FILES = [
  'Voicy_YAHOO.mp3',
  'whistle-47997.mp3',
  'victory-1-90174.mp3',
  'mario-coin-200bpm-82548.mp3',
];

let clickSounds = [];
let clickByName = new Map();
let endSoundPool = [];

async function loadSoundPool() {
  // preload click sounds
  clickSounds = CLICK_SOUND_FILES.map((file) => {
    const a = new Audio(`${SOUND_BASE}/${file}`);
    a.preload = 'auto';
    a.load();
    clickByName.set(file, a);
    return a;
  });
  // preload end sounds
  endSoundPool = END_SOUND_FILES.map((file) => {
    const a = new Audio(`${SOUND_BASE}/${file}`);
    a.preload = 'auto';
    a.load();
    return a;
  });
}

function playClick(nameKey) {
  const filename = CLICK_SOUND_MAP[nameKey];
  const a = filename ? clickByName.get(filename) : null;
  if (!a) return;
  try { a.currentTime = 0; void a.play(); } catch (_) {}
}

function playRandomEndSound() {
  if (!endSoundPool || endSoundPool.length === 0) return;
  const a = endSoundPool[Math.floor(Math.random() * endSoundPool.length)];
  try { a.currentTime = 0; void a.play(); } catch (_) {}
}

function updateDisplay() {
  const m = Math.floor(remainingSeconds / 60);
  const s = remainingSeconds % 60;
  timeLeftEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  modeLabel.textContent = currentMode === 'work' ? 'Work' : 'Break';
}

function renderCoins(count) {
  coinCountEl.textContent = String(count);
  // Render up to 50 icons for performance
  const maxRender = Math.min(50, count);
  coinWallEl.innerHTML = '';
  for (let i = 0; i < maxRender; i++) {
    const span = document.createElement('span');
    span.className = 'nes-icon coin is-large';
    coinWallEl.appendChild(span);
  }
}

function monthNameEn(monthIndex0) {
  return ['January','February','March','April','May','June','July','August','September','October','November','December'][monthIndex0] || '';
}

let currentCalendarYear = new Date().getFullYear();
let currentCalendarMonth = new Date().getMonth() + 1; // 1-12

function setCalendarTitle(y, m) {
  if (calTitleText) {
    calTitleText.textContent = `${monthNameEn(m - 1)} ${y}`;
  }
}

function renderCalendar(rows) {
  if (!calendarGrid) return;
  calendarGrid.innerHTML = '';
  if (!rows || rows.length === 0) return;
  // rows are last N days ascending by date (we built that in main)
  const parse = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const earliest = parse(rows[0].date);
  // map JS getDay() (0=Sun..6=Sat) -> 0=Mon..6=Sun
  const weekdayIndex = (date) => (date.getDay() + 6) % 7;
  const leadEmpty = weekdayIndex(earliest);
  for (let i = 0; i < leadEmpty; i++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell empty';
    calendarGrid.appendChild(cell);
  }
  for (const r of rows) {
    const d = parse(r.date);
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    const top = document.createElement('div');
    top.className = 'date';
    top.textContent = String(d.getDate());
    const bottom = document.createElement('div');
    bottom.className = 'coins';
    if (r.count > 0) {
      const icon = document.createElement('span');
      icon.className = 'nes-icon coin';
      const label = document.createElement('span');
      label.className = 'more';
      label.textContent = ` x ${r.count}`;
      bottom.appendChild(icon);
      bottom.appendChild(label);
    }
    cell.appendChild(top);
    cell.appendChild(bottom);
    calendarGrid.appendChild(cell);
  }
}

function setMode(mode) {
  currentMode = mode;
  const workM = Math.max(1, Number(workMinInput.value) || 25);
  const breakM = Math.max(1, Number(breakMinInput.value) || 5);
  remainingSeconds = (mode === 'work' ? workM : breakM) * 60;
  updateDisplay();
}

function tick() {
  if (!isRunning) return;
  if (remainingSeconds > 0) {
    remainingSeconds -= 1;
    updateDisplay();
    timerId = setTimeout(tick, 1000);
  } else {
    playRandomEndSound();
    // Auto switch mode + reward one coin for completing a "work" interval
    if (currentMode === 'work') {
      // Increment coin for finished focus session
      window.stats.incrementToday(1).then((today) => {
        renderCoins(today);
        // refresh calendar after increment
        if (window.stats.getLastDays) {
          window.stats.getLastDays(30).then(renderCalendar).catch(() => {});
        }
      }).catch(() => {});
      setMode('break');
      // Optionally could pause during break; currently we keep running.
    } else {
      setMode('work');
    }
    timerId = setTimeout(tick, 1000);
  }
}

async function handleStart() {
  if (timerId) clearTimeout(timerId);
  isRunning = true;
  // If starting after a reset ensure the current mode duration is set
  if (remainingSeconds <= 0) setMode(currentMode);
  tick();
}

function handlePause() {
  if (isRunning) {
    isRunning = false;
    if (timerId) clearTimeout(timerId);
  } else {
    // Resume
    isRunning = true;
    tick();
  }
}

function handleSkip() {
  // Toggle to the next mode
  setMode(currentMode === 'work' ? 'break' : 'work');
}

function handleReset() {
  isRunning = false;
  if (timerId) clearTimeout(timerId);
  setMode('work');
}

// Init
setMode('work');
updateDisplay();
// Load today's coin count
if (window.stats && window.stats.loadToday) {
  window.stats.loadToday().then((today) => {
    renderCoins(today);
  }).catch(() => renderCoins(0));
} else {
  renderCoins(0);
}
// Load last 30 days calendar
async function refreshCalendar(y, m) {
  setCalendarTitle(y, m);
  if (window.stats && window.stats.getMonth) {
    try {
      const rows = await window.stats.getMonth(y, m);
      renderCalendar(rows);
    } catch (_) {}
  }
}

// initial calendar to current month
refreshCalendar(currentCalendarYear, currentCalendarMonth);

if (calPrevBtn) {
  calPrevBtn.addEventListener('click', () => {
    const d = new Date(currentCalendarYear, currentCalendarMonth - 2, 1);
    currentCalendarYear = d.getFullYear();
    currentCalendarMonth = d.getMonth() + 1;
    refreshCalendar(currentCalendarYear, currentCalendarMonth);
  });
}
if (calNextBtn) {
  calNextBtn.addEventListener('click', () => {
    const d = new Date(currentCalendarYear, currentCalendarMonth, 1);
    currentCalendarYear = d.getFullYear();
    currentCalendarMonth = d.getMonth() + 1;
    refreshCalendar(currentCalendarYear, currentCalendarMonth);
  });
}
startBtn.addEventListener('click', handleStart);
pauseBtn.addEventListener('click', handlePause);
skipBtn.addEventListener('click', handleSkip);
resetBtn.addEventListener('click', handleReset);

// Init sounds and click SFX
loadSoundPool();
startBtn.addEventListener('click', () => playClick('start'), { capture: true });
pauseBtn.addEventListener('click', () => playClick('pause'), { capture: true });
skipBtn.addEventListener('click', () => playClick('skip'), { capture: true });
resetBtn.addEventListener('click', () => playClick('reset'), { capture: true });

// Close button
if (closeBtn) {
  closeBtn.addEventListener('click', () => {
    if (window.windowControls && window.windowControls.close) {
      window.windowControls.close();
    }
  });
}


