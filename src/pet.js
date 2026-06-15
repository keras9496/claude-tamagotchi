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
let facing = 1;
let phase = 1;
let lastStep = 0;
let reactType = null;
let reactUntil = 0;

window.petAPI.onMotion(({ walking: w, direction }) => {
  walking = w;
  facing = direction;
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

function drawEye(c, r, pal) {
  const x = c * SCALE, y = r * SCALE;
  ctx.fillStyle = pal.eye;
  if (mood === 'hungry') ctx.fillRect(x, y + 5, SCALE, 4);          // 처진 눈
  else if (mood === 'tired') ctx.fillRect(x, y + 4, SCALE, 2);      // 감은 눈
  else ctx.fillRect(x + 1, y + 1, SCALE - 2, SCALE - 2);            // 또렷한 눈
}

function draw(t) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const pal = PAL[mood] || PAL.happy;
  const reacting = t < reactUntil;

  // 세로 오프셋(px): 위(-)로 점프/숨쉬기, 아래(+)로 처짐
  let bobPx;
  if (reacting) {
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
      if (ch === 'E') drawEye(c, r, pal);
      else px(c, r, pal.body);
    }
  }

  // 다리
  const L = walking ? legs(phase) : legs(0);
  for (const c of L.down) { px(c, 6, pal.body); px(c, 7, pal.body); }
  for (const c of L.up) { px(c, 6, pal.body); }

  // 기분 오버레이
  if (!reacting && mood === 'working') {
    const tw = Math.sin(t / 140) > 0 ? '#FFD27A' : '#FFE8B0';
    px(0, 0, tw); px(10, 1, tw);
  }
  if (!reacting && mood === 'hungry') {
    if (Math.sin(t / 320) > -0.2) px(9, 0, '#BEE3F0'); // 식은땀
  }
  if (!reacting && mood === 'tired') {
    ctx.fillStyle = '#9aa7b5';
    ctx.font = 'bold 9px monospace';
    const zy = 8 + Math.sin(t / 400) * 1.5;
    ctx.fillText('z', 9.4 * SCALE, zy + 4);
    ctx.fillText('z', 10 * SCALE, zy - 3);
  }
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

// 클릭 → 말풍선 + 상태창
document.body.addEventListener('click', async () => {
  window.petAPI.clicked();
  try { showBubble((await window.petAPI.getState()).message); } catch (_) {}
});
