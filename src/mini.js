const $ = (id) => document.getElementById(id);

// 펫 이름·언어를 가져와 라벨을 채운다 (상태창과 동일한 getState 사용).
async function init() {
  try {
    const s = await window.petAPI.getState();
    $('petName').textContent = s.name;
    const t = window.petAPI.strings[s.lang] || window.petAPI.strings.ko;
    $('lblShow').textContent = t.showBtn;
    $('lblRestart').textContent = t.restartBtn;
  } catch (_) {}
}

$('showBtn').addEventListener('click', () => window.petAPI.show());
$('restartBtn').addEventListener('click', () => window.petAPI.restart());

init();
