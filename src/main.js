const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const { getState, feed, play, setName, talk } = require('./state');
const { writeState } = require('./collector');

const PET_W = 160;
const PET_H = 160;
const STATUS_W = 300;
const STATUS_H = 540;
const NAME_W = 300;
const NAME_H = 360;

let petWin = null;
let statusWin = null;
let nameWin = null;
let dragCtl = null; // 드래그 제어 핸들 (startWalking 에서 채움)

// 단일 인스턴스 보장: SessionStart 훅이 매 세션마다 실행돼도 펫은 하나만.
// (락을 못 잡으면 = 이미 떠 있으면 즉시 종료)
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

// ── 펫 창 생성 (투명 / 프레임 없음 / 항상 위) ──────────────────────────
function createPetWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  const startX = workArea.x + Math.round(workArea.width / 2);
  const startY = workArea.y + workArea.height - PET_H;

  petWin = new BrowserWindow({
    width: PET_W,
    height: PET_H,
    x: startX,
    y: startY,
    show: false,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    paintWhenInitiallyHidden: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false, // preload 에서 로컬 모듈(i18n) require 허용
    },
  });

  petWin.once('ready-to-show', () => {
    petWin.show();
  });
  petWin.loadFile(path.join(__dirname, 'pet.html'));
  startWalking(workArea);
}

// ── 산책 로직: 메인 프로세스가 창 위치를 움직인다 ─────────────────────
function startWalking(workArea) {
  const floorY = workArea.y + workArea.height - PET_H;
  const minX = workArea.x;
  const maxX = workArea.x + workArea.width - PET_W;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  let x = petWin.getBounds().x;
  let y = floorY;
  let vy = 0;        // 낙하 속도 (드래그 후 바닥으로 복귀)
  let dir = 1;       // 1=오른쪽, -1=왼쪽
  let mode = 'walk'; // 'walk' | 'idle'
  let modeTicks = 0;
  let dragging = false;
  let dragOffset = { x: 0, y: 0 };
  const SPEED = 2;
  const GRAVITY = 1.6;

  // 드래그 제어: 렌더러의 mousedown/up → IPC 로 호출된다
  dragCtl = {
    start() {
      const cur = screen.getCursorScreenPoint();
      const b = petWin.getBounds();
      dragOffset = { x: cur.x - b.x, y: cur.y - b.y };
      vy = 0;
      dragging = true;
    },
    end() { dragging = false; }, // 이후 루프에서 바닥으로 낙하
  };

  setInterval(() => {
    if (!petWin || petWin.isDestroyed()) return;

    // 1) 드래그 중: 창을 커서에 붙여 따라다닌다
    if (dragging) {
      const cur = screen.getCursorScreenPoint();
      x = clamp(cur.x - dragOffset.x, minX, maxX);
      y = clamp(cur.y - dragOffset.y, workArea.y, floorY);
      petWin.setBounds({ x: Math.round(x), y: Math.round(y), width: PET_W, height: PET_H });
      petWin.webContents.send('pet-motion', { walking: false, direction: dir });
      return;
    }

    // 2) 공중에 있으면 바닥으로 낙하 (놓으면 떨어짐)
    if (y < floorY) {
      vy += GRAVITY;
      y = Math.min(floorY, y + vy);
      if (y >= floorY) vy = 0;
      petWin.setBounds({ x: Math.round(x), y: Math.round(y), width: PET_W, height: PET_H });
      petWin.webContents.send('pet-motion', { walking: false, direction: dir, falling: true });
      return;
    }

    // 3) 평소 산책
    modeTicks--;
    if (modeTicks <= 0) {
      // 가끔 멈춰 쉬거나 방향을 바꾼다
      if (mode === 'walk' && Math.random() < 0.5) {
        mode = 'idle';
        modeTicks = 40 + Math.floor(Math.random() * 60);
      } else {
        mode = 'walk';
        if (Math.random() < 0.4) dir *= -1;
        modeTicks = 60 + Math.floor(Math.random() * 120);
      }
    }

    if (mode === 'walk') {
      x += SPEED * dir;
      if (x <= minX) { x = minX; dir = 1; }
      if (x >= maxX) { x = maxX; dir = -1; }
      petWin.setBounds({ x: Math.round(x), y: floorY, width: PET_W, height: PET_H });
    }

    petWin.webContents.send('pet-motion', {
      walking: mode === 'walk',
      direction: dir,
    });
  }, 50);
}

// ── 이름 짓기 창 (첫 실행 시 1회) ─────────────────────────────────────
function createNameWindow() {
  if (nameWin && !nameWin.isDestroyed()) { nameWin.focus(); return; }
  const { workArea } = screen.getPrimaryDisplay();
  const x = workArea.x + Math.round((workArea.width - NAME_W) / 2);
  const y = workArea.y + Math.round((workArea.height - NAME_H) / 3);

  nameWin = new BrowserWindow({
    width: NAME_W,
    height: NAME_H,
    x, y,
    show: false,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    paintWhenInitiallyHidden: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), sandbox: false },
  });
  nameWin.once('ready-to-show', () => nameWin.show());
  nameWin.loadFile(path.join(__dirname, 'name.html'));
}

// 이름이 없으면 네이밍 창을 띄운다
function maybePromptName() {
  try {
    if (!getState().named) createNameWindow();
  } catch (_) {}
}

// ── 상태창 토글 ───────────────────────────────────────────────────────
function toggleStatusWindow() {
  if (statusWin && !statusWin.isDestroyed()) {
    statusWin.close();
    statusWin = null;
    return;
  }
  const petBounds = petWin.getBounds();
  const { workArea } = screen.getPrimaryDisplay();
  let x = petBounds.x + PET_W / 2 - STATUS_W / 2;
  x = Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - STATUS_W));
  let y = petBounds.y - STATUS_H - 8;
  if (y < workArea.y) y = petBounds.y + PET_H + 8;

  statusWin = new BrowserWindow({
    width: STATUS_W,
    height: STATUS_H,
    x: Math.round(x),
    y: Math.round(y),
    show: false,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    paintWhenInitiallyHidden: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), sandbox: false },
  });
  statusWin.once('ready-to-show', () => {
    statusWin.show();
  });
  statusWin.loadFile(path.join(__dirname, 'status.html'));
  statusWin.on('blur', () => {
    if (statusWin && !statusWin.isDestroyed()) { statusWin.close(); statusWin = null; }
  });
}

// ── IPC ───────────────────────────────────────────────────────────────
ipcMain.handle('get-state', () => getState());
ipcMain.on('pet-open-status', () => toggleStatusWindow());
ipcMain.handle('pet-talk', () => talk());
ipcMain.on('pet-drag-start', () => { if (dragCtl) dragCtl.start(); });
ipcMain.on('pet-drag-end', () => { if (dragCtl) dragCtl.end(); });

function reactOnPet(type) {
  if (petWin && !petWin.isDestroyed()) petWin.webContents.send('pet-react', { type });
}
ipcMain.handle('feed', () => {
  const r = feed();
  if (r.ok) reactOnPet('eat');
  return r;
});
ipcMain.handle('play', () => {
  const r = play();
  if (r.ok) reactOnPet('play');
  return r;
});
ipcMain.handle('set-name', (_e, name, lang) => {
  const r = setName(name, lang);
  if (r.ok) {
    if (nameWin && !nameWin.isDestroyed()) { nameWin.close(); nameWin = null; }
    reactOnPet('named'); // 펫이 새 이름으로 인사
  }
  return r;
});

// 수집기를 주기적으로 돌려 state.json 갱신 (시작 시 1회 + 60초마다)
function startCollector() {
  const tick = () => {
    try { writeState(); }
    catch (e) { console.error('[collector]', e.message); }
  };
  tick();
  setInterval(tick, 60000);
}

app.whenReady().then(() => {
  startCollector();
  createPetWindow();
  maybePromptName(); // 이름이 아직 없으면 네이밍 창
});
app.on('window-all-closed', () => app.quit());
