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
const minimizeBtn = document.getElementById('minimize-btn');
const calendarGrid = document.getElementById('calendar-grid');
const calTitleText = document.getElementById('cal-title-text');
const calPrevBtn = document.getElementById('cal-prev');
const calNextBtn = document.getElementById('cal-next');
const todoInput = document.getElementById('todo-input');
const todoAddBtn = document.getElementById('todo-add');
const todoClearBtn = document.getElementById('todo-clear');
const todoListEl = document.getElementById('todo-list');

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
  // keep existing finish sounds
  'Voicy_YAHOO.mp3',
  'whistle-47997.mp3',
  'victory-1-90174.mp3',
  'mario-coin-200bpm-82548.mp3',
  // expanded library (excluding button click sounds)
  '04-stage-start.mp3',
  '139-item-catch.mp3',
  '3-2-1-go-green-screen-footage-2xoehcl8evq.mp3',
  '8d82b5_doom_shotgun_firing_sound_effect.mp3',
  '8d82b5_sc_marine_you_wanna_piece_of_me_boy_sound_effect.mp3',
  'batman-transition-download-sound-link.mp3',
  'for-the-emperor_CDrYyoT.mp3',
  'icandothat.mp3',
  'mlg-resource-street-fighter-ko-greenscreen.mp3',
  'overtime.mp3',
  'ryka.mp3',
  'space-marine-attack.mp3',
  'ssbannouncer-game.mp3',
  'super-mario-beedoo_F3cwLoe.mp3',
  'the-ultimate-world-of-warcraft-sms-sound-hdhq-3-quest-complete-27b_nukk0k0.mp3',
  'tmpb1ci9teh.mp3',
  'wc3-peon-says-work-work-only-.mp3',
  'welcome-mercador-resident-evil-4.mp3',
  'world_of_warcraft_-_alliance_battleground_victory.mp3',
  'wow-incredible-meme-with-sound.mp3',
  'ww_beedle_thankyou.mp3',
  'z40-thank-you-mp3.mp3',
];

let clickSounds = [];
let clickByName = new Map();
let endSoundPool = [];

// Overlay drawing (small PNG with remaining time)
const overlayCanvas = document.createElement('canvas');
overlayCanvas.width = 64; overlayCanvas.height = 64; // Windows overlay prefers small square
const overlayCtx = overlayCanvas.getContext('2d');

function drawAndSetOverlay(seconds, mode, running) {
  if (!window.overlay || typeof window.overlay.set !== 'function') return;
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  const text = m > 0 ? String(m) : String(s);

  const COLORS = {
    work: { bg: '#112033', stroke: '#3ea6ff', text: '#ffffff' },
    break: { bg: '#112e19', stroke: '#3aff6a', text: '#ffffff' },
    paused: { bg: '#2b2b2b', stroke: '#f0c040', text: '#ffffff' },
  };
  const theme = running ? (mode === 'break' ? COLORS.break : COLORS.work) : COLORS.paused;

  const ctx = overlayCtx;
  ctx.clearRect(0, 0, 64, 64);
  // background circle
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fillStyle = theme.bg;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.stroke;
  ctx.stroke();

  // content: time or pause icon
  if (running) {
    ctx.fillStyle = theme.text;
    const isTwoPlus = text.length >= 2;
    ctx.font = `${isTwoPlus ? 34 : 40}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 32, 34);
  } else {
    // pause icon "||"
    ctx.fillStyle = theme.stroke;
    const barW = 8, barH = 26, gap = 8;
    const y = 32 - barH / 2;
    ctx.fillRect(32 - gap/2 - barW, y, barW, barH);
    ctx.fillRect(32 + gap/2, y, barW, barH);
  }

  const dataUrl = overlayCanvas.toDataURL('image/png');
  const desc = running ? `${mode === 'break' ? 'Break' : 'Work'} ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : 'Paused';
  window.overlay.set(dataUrl, desc);
}

function clearOverlay() {
  if (window.overlay && typeof window.overlay.clear === 'function') {
    window.overlay.clear();
  }
}

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

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text != null) e.textContent = String(text);
  return e;
}

function renderTodoList(items) {
  if (!todoListEl) return;
  todoListEl.innerHTML = '';
  if (!Array.isArray(items)) return;
  for (const t of items) {
    const li = document.createElement('li');
    const label = document.createElement('label');
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.gap = '10px';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!t.done;
    checkbox.addEventListener('change', async () => {
      try {
        const list = await window.tasks.toggle(t.id);
        renderTodoList(list);
      } catch (_) {}
    });

    const span = el('span', null, t.text || '');
    if (t.done) {
      span.style.textDecoration = 'line-through';
      span.style.opacity = '0.7';
    }

    const removeBtn = el('button', 'nes-btn is-error', '✕');
    removeBtn.style.marginLeft = 'auto';
    removeBtn.addEventListener('click', async () => {
      try {
        const list = await window.tasks.remove(t.id);
        renderTodoList(list);
      } catch (_) {}
    });

    label.appendChild(checkbox);
    label.appendChild(span);
    label.appendChild(removeBtn);
    li.appendChild(label);
    todoListEl.appendChild(li);
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
    // update overlay icon each second while running
    try { drawAndSetOverlay(remainingSeconds, currentMode, true); } catch (_) {}
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
    // after switching mode keep running and refresh overlay for new session
    try { drawAndSetOverlay(remainingSeconds, currentMode, true); } catch (_) {}
    timerId = setTimeout(tick, 1000);
  }
}

async function handleStart() {
  if (timerId) clearTimeout(timerId);
  isRunning = true;
  // If starting after a reset ensure the current mode duration is set
  if (remainingSeconds <= 0) setMode(currentMode);
  tick();
  try { drawAndSetOverlay(remainingSeconds, currentMode, true); } catch (_) {}
  try { if (window.powerSave && window.powerSave.enable) window.powerSave.enable(); } catch (_) {}
}

function handlePause() {
  if (isRunning) {
    isRunning = false;
    if (timerId) clearTimeout(timerId);
    // show paused state on overlay
    try { drawAndSetOverlay(remainingSeconds, currentMode, false); } catch (_) {}
    try { if (window.powerSave && window.powerSave.disable) window.powerSave.disable(); } catch (_) {}
  } else {
    // Resume
    isRunning = true;
    tick();
    try { drawAndSetOverlay(remainingSeconds, currentMode, true); } catch (_) {}
    try { if (window.powerSave && window.powerSave.enable) window.powerSave.enable(); } catch (_) {}
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
  clearOverlay();
  try { if (window.powerSave && window.powerSave.disable) window.powerSave.disable(); } catch (_) {}
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

if (minimizeBtn) {
  minimizeBtn.addEventListener('click', () => {
    if (window.windowControls && window.windowControls.minimize) {
      window.windowControls.minimize();
    }
  });
}

// To-Do init and handlers
async function initTodo() {
  if (!window.tasks) return;
  try {
    const list = await window.tasks.loadToday();
    renderTodoList(list);
  } catch (_) {}
}

if (todoAddBtn && todoInput) {
  const add = async () => {
    const text = (todoInput.value || '').trim();
    if (!text) return;
    try {
      const list = await window.tasks.add(text);
      todoInput.value = '';
      renderTodoList(list);
    } catch (_) {}
  };
  todoAddBtn.addEventListener('click', add);
  todoInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') add();
  });
}

if (todoClearBtn) {
  todoClearBtn.addEventListener('click', async () => {
    try {
      const list = await window.tasks.clearCompleted();
      renderTodoList(list);
    } catch (_) {}
  });
}

initTodo();


