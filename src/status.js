const $ = (id) => document.getElementById(id);

function fmt(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}

function timeAgo(iso, t) {
  if (!iso) return t.none;
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return t.justNow;
  if (diff < 3600) return Math.floor(diff / 60) + t.minAgo;
  if (diff < 86400) return Math.floor(diff / 3600) + t.hourAgo;
  return Math.floor(diff / 86400) + t.dayAgo;
}

// 언어에 따라 고정 라벨(이모지 포함)을 채운다
function applyLabels(t) {
  $('lblHappy').textContent = '❤️ ' + t.happiness;
  $('lblFood').textContent = '🍚 ' + t.food;
  $('lblEnergy').textContent = '⚡ ' + t.energy;
  $('lblPoints').textContent = t.feedPoints;
  $('lblSince').textContent = t.sinceInstall;
  $('lblFeed').textContent = '🍚 ' + t.feedBtn;
  $('lblPlay').textContent = '🎮 ' + t.playBtn;
  $('lblToday').textContent = t.today;
  $('lblTotal').textContent = t.total;
  $('lblLast').textContent = t.lastActive;
  $('lblClose').textContent = t.closeHint;
  $('lblRestart').textContent = t.restartBtn;
  $('lblHide').textContent = t.hideBtn;
}

function apply(s) {
  const t = window.petAPI.strings[s.lang] || window.petAPI.strings.ko;
  applyLabels(t);

  $('petName').textContent = s.name;
  $('model').textContent = s.model;
  $('moodBadge').textContent = t.mood[s.mood] || s.mood;
  $('message').textContent = s.message;

  $('happyVal').textContent = s.happiness + '%';
  $('happyBar').style.width = s.happiness + '%';
  $('foodVal').textContent = s.food + '%';
  $('foodBar').style.width = s.food + '%';
  $('energyVal').textContent = s.energy + '%';
  $('energyBar').style.width = s.energy + '%';

  $('pointsVal').textContent = fmt(s.availablePoints) + ' tok';
  $('feedCost').textContent = '-' + fmt(s.feedCost);
  $('playCost').textContent = '-' + fmt(s.playCost);
  $('feedBtn').disabled = !s.canFeed || s.food >= 100;
  $('playBtn').disabled = !s.canPlay || s.energy >= 100;

  $('todayVal').textContent = fmt(s.tokensToday);
  $('totalVal').textContent = fmt(s.tokensTotal);
  $('lastVal').textContent = timeAgo(s.lastActiveISO, t);
  $('source').textContent = s.source;
}

async function refresh() {
  apply(await window.petAPI.getState());
}

$('feedBtn').addEventListener('click', async () => {
  $('feedBtn').classList.add('flash');
  const r = await window.petAPI.feed();
  setTimeout(() => $('feedBtn').classList.remove('flash'), 400);
  apply(r);
});

$('playBtn').addEventListener('click', async () => {
  $('playBtn').classList.add('flash');
  const r = await window.petAPI.play();
  setTimeout(() => $('playBtn').classList.remove('flash'), 400);
  apply(r);
});

// 재시작: 앱을 껐다 켜 코드 변경을 반영한다(펫 상태는 pet.json에 보존됨).
$('restartBtn').addEventListener('click', () => window.petAPI.restart());
// 넣어두기: 펫을 숨기고 미니 독을 띄운다.
$('hideBtn').addEventListener('click', () => window.petAPI.hide());

refresh();
setInterval(refresh, 2000);
