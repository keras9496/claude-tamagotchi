// Claw'd 픽셀 스프라이트 렌더러.
// 도트맵은 Claude Code 공식 에셋(resources/clawd.svg, 47x38, #D97757)을 디코딩한 것.

const canvas = document.getElementById('claw');
const ctx = canvas.getContext('2d');
const bubble = document.getElementById('bubble');

const GW = 11, GH = 8, SCALE = 9;
const TOP_PAD = 14; // 점프/숨쉬기 여유
canvas.width = GW * SCALE;
canvas.height = GH * SCALE + TOP_PAD + 10;

// 몸통(다리 제외). '.'=빈칸, 'O'=몸통, 'E'=눈
const BODY = [
  '.OOOOOOOOO.',
  '.OOOOOOOOO.',
  'OOEOOOOOEOO', // 집게발(양끝) + 눈(c2,c8)
  'OOOOOOOOOOO',
  '.OOOOOOOOO.',
  '.OOOOOOOOO.',
];

const PAL = {
  happy:   { body: '#D97757', eye: '#1E1E1E' },
  working: { body: '#E5825D', eye: '#1E1E1E' },
  hungry:  { body: '#C49A8A', eye: '#2B2B2B' },
  tired:   { body: '#CBA292', eye: '#2B2B2B' },
};

// 걷기 프레임: 내려간 다리=2칸, 든 다리=1칸
function legs(phase) {
  if (phase === 0) return { down: [1, 3, 7, 9], up: [] };
  if (phase === 1) return { down: [1, 9], up: [3, 7] };
  return { down: [3, 7], up: [1, 9] };
}

let mood = 'happy';
let petName = "Claw'd";
let strings = window.petAPI.strings.ko; // 현재 언어 문자열 (refreshState 에서 갱신)
let walking = false;
let falling = false;
let facing = 1;
let phase = 1;
let lastStep = 0;
let reactType = null;
let reactUntil = 0;

// 좌클릭 시 잠깐 나오는 표정. eye=눈 모양, mouth=입 모양, jump=폴짝 여부.
const EXPRESSIONS = {
  happy:     { eye: 'caret', mouth: 'smile', jump: true },  // ^_^ 웃음
  love:      { eye: 'heart', mouth: 'smile', jump: true },  // 하트눈
  dizzy:     { eye: 'x',     mouth: 'open',  jump: false }, // X_X 어질어질
  surprised: { eye: 'wide',  mouth: 'o',     jump: false }, // 놀람
  wink:      { eye: 'wink',  mouth: 'smile', jump: false }, // 윙크
  yum:       { eye: 'caret', mouth: 'munch', jump: true },  // 냠냠
};
const EXPR_KEYS = Object.keys(EXPRESSIONS);
let exprKey = null;
let exprUntil = 0;

window.petAPI.onMotion((m) => {
  walking = m.walking;
  facing = m.direction;
  falling = !!m.falling;
});

window.petAPI.onReact(({ type }) => {
  reactType = type;
  reactUntil = performance.now() + 1400;
  let text;
  if (type === 'eat') text = strings.reactEat;
  else if (type === 'named') text = strings.reactNamed.replace('{name}', petName);
  else text = strings.reactPlay;
  showBubble(text);
});

// 밥/체력을 0=충분, 1=조금부족, 2=많이부족 단계로
function tier(v) { return v <= 25 ? 2 : v <= 50 ? 1 : 0; }
function pickAlert(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

let prevFoodTier = 0;
let prevEnergyTier = 0;

async function refreshState() {
  try {
    const s = await window.petAPI.getState();
    mood = s.mood;
    petName = s.name;
    strings = window.petAPI.strings[s.lang] || window.petAPI.strings.ko;

    const ft = tier(s.food);
    const et = tier(s.energy);

    // 단계가 '나빠질 때'만 한 번 알림 (더 급한 단계 우선, 회복은 알리지 않음)
    let msg = null, sev = 0;
    if (ft > prevFoodTier && strings.alerts.food[ft]) { msg = pickAlert(strings.alerts.food[ft]); sev = ft; }
    if (et > prevEnergyTier && strings.alerts.energy[et] && et >= sev) { msg = pickAlert(strings.alerts.energy[et]); }
    prevFoodTier = ft;
    prevEnergyTier = et;

    // 먹이/놀이 반응 중이면 덮어쓰지 않음
    if (msg && performance.now() >= reactUntil) showBubble(msg);
  } catch (_) {}
}
// 첫 점검은 창이 뜨고 살짝 뒤에 (인사·상태 말풍선이 화면에 보이도록)
setTimeout(refreshState, 1500);
setInterval(refreshState, 3000);

function px(c, r, color) {
  ctx.fillStyle = color;
  ctx.fillRect(c * SCALE, r * SCALE, SCALE, SCALE);
}

function drawEye(c, r, pal, expr) {
  const x = c * SCALE, y = r * SCALE;
  const isLeft = c < GW / 2;

  // 표정이 활성화된 경우: 표정별 눈 모양으로 덮어쓴다
  if (expr) {
    ctx.fillStyle = pal.body; ctx.fillRect(x, y, SCALE, SCALE); // 눈 칸을 몸통색으로 채워 구멍 방지
    const e = expr.eye;
    if (e === 'x') {                                  // X_X
      ctx.strokeStyle = pal.eye; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + 1, y + 1); ctx.lineTo(x + SCALE - 1, y + SCALE - 1);
      ctx.moveTo(x + SCALE - 1, y + 1); ctx.lineTo(x + 1, y + SCALE - 1);
      ctx.stroke();
      return;
    }
    if (e === 'caret') {                              // ^ ^ (웃는 눈)
      ctx.strokeStyle = pal.eye; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x + 1, y + SCALE - 2); ctx.lineTo(x + SCALE / 2, y + 2); ctx.lineTo(x + SCALE - 1, y + SCALE - 2);
      ctx.stroke();
      return;
    }
    if (e === 'wink') {                               // 한쪽 감기
      if (isLeft) { ctx.fillStyle = pal.eye; ctx.fillRect(x, y, SCALE, SCALE); }
      else {
        ctx.strokeStyle = pal.eye; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x + 1, y + SCALE - 2); ctx.lineTo(x + SCALE / 2, y + 2); ctx.lineTo(x + SCALE - 1, y + SCALE - 2);
        ctx.stroke();
      }
      return;
    }
    if (e === 'heart') {                              // 하트눈
      ctx.fillStyle = '#E0245E';
      const u = SCALE / 4, cx = x + SCALE / 2, cy = y + SCALE / 2 - u / 2;
      ctx.beginPath();
      ctx.arc(cx - u, cy, u, Math.PI, 0);
      ctx.arc(cx + u, cy, u, Math.PI, 0);
      ctx.lineTo(cx, y + SCALE - 1);
      ctx.closePath();
      ctx.fill();
      return;
    }
    if (e === 'wide') {                               // 놀란 눈(흰자 + 동공)
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + SCALE / 2, y + SCALE / 2, SCALE / 2 - 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = pal.eye; ctx.beginPath(); ctx.arc(x + SCALE / 2, y + SCALE / 2, SCALE / 4, 0, Math.PI * 2); ctx.fill();
      return;
    }
  }

  // 평소: 기분별 눈
  ctx.fillStyle = pal.eye;
  if (mood === 'hungry') ctx.fillRect(x, y + 5, SCALE, 4);          // 처진 눈
  else if (mood === 'tired') ctx.fillRect(x, y + 4, SCALE, 2);      // 감은 눈
  else ctx.fillRect(x, y, SCALE, SCALE);                            // 또렷한 눈(칸 전체)
}

// 입 모양 (표정용). 몸통 변환(translate/flip) 안에서 호출.
function drawMouth(kind, t) {
  const mx = 5 * SCALE, my = 5 * SCALE;
  if (kind === 'smile') {
    ctx.strokeStyle = '#7a3f24'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(mx + SCALE / 2, my - 1, SCALE * 0.7, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  } else if (kind === 'o') {
    ctx.fillStyle = '#7a3f24';
    ctx.beginPath(); ctx.arc(mx + SCALE / 2, my + 1, SCALE * 0.45, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'open') {
    ctx.fillStyle = '#7a3f24';
    ctx.fillRect(mx, my, SCALE, Math.round(SCALE * 0.7));
  } else if (kind === 'munch') {
    if (Math.sin(t / 90) > 0) { ctx.fillStyle = '#a9683f'; ctx.fillRect(mx, my, SCALE, SCALE); }
  }
}

function draw(t) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const pal = PAL[mood] || PAL.happy;
  const reacting = t < reactUntil;
  let expr = t < exprUntil ? EXPRESSIONS[exprKey] : null;
  if (falling) expr = EXPRESSIONS.surprised; // 떨어지는 동안 놀란 표정

  // 세로 오프셋(px): 위(-)로 점프/숨쉬기, 아래(+)로 처짐
  let bobPx;
  if (reacting || (expr && expr.jump)) {
    bobPx = -Math.abs(Math.sin(t / 70)) * 12;                       // 신나게 점프
  } else if (walking) {
    if (t - lastStep > 200) { phase = phase === 1 ? 2 : 1; lastStep = t; }
    bobPx = phase === 1 ? 0 : -3;
  } else {
    const sp = (mood === 'working') ? 220 : (mood === 'tired' ? 1000 : 600);
    bobPx = -Math.round(Math.abs(Math.sin(t / sp))) * 2;
  }
  const droopPx = (mood === 'hungry' || mood === 'tired') ? 6 : 0;
  const yPx = TOP_PAD + droopPx + bobPx;

  ctx.save();
  ctx.translate(0, yPx);
  if (facing < 0) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }

  // 몸통
  for (let r = 0; r < BODY.length; r++) {
    for (let c = 0; c < GW; c++) {
      const ch = BODY[r][c];
      if (ch === '.') continue;
      if (ch === 'E') drawEye(c, r, pal, expr);
      else px(c, r, pal.body);
    }
  }

  // 다리
  const L = walking ? legs(phase) : legs(0);
  for (const c of L.down) { px(c, 6, pal.body); px(c, 7, pal.body); }
  for (const c of L.up) { px(c, 6, pal.body); }

  // 기분 오버레이 (반응/표정 중엔 잠시 숨김)
  const idle = !reacting && !expr;
  if (idle && mood === 'working') {
    const tw = Math.sin(t / 140) > 0 ? '#FFD27A' : '#FFE8B0';
    px(0, 0, tw); px(10, 1, tw);
  }
  if (idle && mood === 'hungry') {
    if (Math.sin(t / 320) > -0.2) px(9, 0, '#BEE3F0'); // 식은땀
  }
  if (idle && mood === 'tired') {
    ctx.fillStyle = '#9aa7b5';
    ctx.font = 'bold 9px monospace';
    const zy = 8 + Math.sin(t / 400) * 1.5;
    ctx.fillText('z', 9.4 * SCALE, zy + 4);
    ctx.fillText('z', 10 * SCALE, zy - 3);
  }
  // 클릭 표정의 입
  if (expr) drawMouth(expr.mouth, t);
  // 먹이 반응: 입가 냠냠 픽셀
  if (reacting && reactType === 'eat' && Math.sin(t / 90) > 0) {
    px(5, 5, '#a9683f');
  }

  ctx.restore();
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);

function showBubble(text) {
  bubble.textContent = text;
  bubble.classList.add('show');
  clearTimeout(bubble._t);
  bubble._t = setTimeout(() => bubble.classList.remove('show'), 2600);
}

// ── 상호작용: 단일 클릭=대사 / 더블클릭·우클릭=상태창 / 드래그=이동 ──
let pressX = 0, pressY = 0, dragging = false, clickTimer = null;
const DRAG_THRESHOLD = 4; // px (이만큼 움직이면 드래그로 판정)
const CLICK_DELAY = 260;  // 단일/더블 클릭 구분 대기(ms)

function makeFace() {
  exprKey = EXPR_KEYS[Math.floor(Math.random() * EXPR_KEYS.length)];
  exprUntil = performance.now() + 1400;
}

async function talk() {
  makeFace(); // 좌클릭마다 랜덤 표정
  try {
    const r = await window.petAPI.talk();
    if (r && r.line) showBubble(r.line);
  } catch (_) {}
}

document.body.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return; // 좌클릭만
  pressX = e.screenX; pressY = e.screenY;
  dragging = false;
});

window.addEventListener('mousemove', (e) => {
  if (e.buttons !== 1 || dragging) return; // 좌버튼 눌린 채 이동할 때만
  const dx = e.screenX - pressX, dy = e.screenY - pressY;
  if (dx * dx + dy * dy > DRAG_THRESHOLD * DRAG_THRESHOLD) {
    dragging = true;
    window.petAPI.dragStart();
  }
});

window.addEventListener('mouseup', (e) => {
  if (e.button === 0 && dragging) window.petAPI.dragEnd();
});

document.body.addEventListener('click', () => {
  if (dragging) { dragging = false; return; }  // 드래그였으면 클릭 무시
  if (clickTimer) return;                       // 더블클릭의 두 번째 클릭
  clickTimer = setTimeout(() => { clickTimer = null; talk(); }, CLICK_DELAY);
});

document.body.addEventListener('dblclick', () => {
  if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
  window.petAPI.openStatus();
});

// 우클릭으로도 상태창 (빠른 접근)
document.body.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  window.petAPI.openStatus();
});
