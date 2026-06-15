// 자동 실행 설치기.
// Claude Code 의 SessionStart 훅(~/.claude/settings.json)에 펫 런처를 등록한다.
// 세션이 시작될 때마다 launch.js 가 실행되고, 단일 인스턴스 락 덕분에 펫은 항상 하나만 뜬다.
//
//   node src/install.js              ← 등록
//   node src/install.js --uninstall  ← 해제
//   node src/install.js --status     ← 현재 상태 확인

const fs = require('fs');
const os = require('os');
const path = require('path');

const SETTINGS = path.join(os.homedir(), '.claude', 'settings.json');
const LAUNCH = path.join(__dirname, 'launch.js');
const COMMAND = `node "${LAUNCH}"`;

// 우리 훅인지 식별: launch.js 절대경로를 명령에 포함하는지로 판별
function isOurs(cmd) {
  return typeof cmd === 'string' && cmd.includes('launch.js') && cmd.includes(__dirname);
}

function load() {
  try { return JSON.parse(fs.readFileSync(SETTINGS, 'utf8')); }
  catch { return {}; }
}

function save(obj) {
  fs.mkdirSync(path.dirname(SETTINGS), { recursive: true });
  fs.writeFileSync(SETTINGS, JSON.stringify(obj, null, 2));
}

function findGroups(settings) {
  return (settings.hooks && settings.hooks.SessionStart) || [];
}

function alreadyInstalled(settings) {
  return findGroups(settings).some((g) =>
    (g.hooks || []).some((h) => isOurs(h.command))
  );
}

function install() {
  const settings = load();
  if (alreadyInstalled(settings)) {
    console.log('이미 등록돼 있어요. (SessionStart 훅)');
    return;
  }
  settings.hooks = settings.hooks || {};
  settings.hooks.SessionStart = settings.hooks.SessionStart || [];
  settings.hooks.SessionStart.push({
    hooks: [{ type: 'command', command: COMMAND }],
  });
  save(settings);
  console.log('✅ 자동 실행 등록 완료!');
  console.log('   이제 Claude Code 를 새로 시작하면 펫이 함께 떠요.');
  console.log(`   설정 파일: ${SETTINGS}`);
}

function uninstall() {
  const settings = load();
  const groups = findGroups(settings);
  if (!groups.length) { console.log('등록된 훅이 없어요.'); return; }

  // 우리 명령을 각 그룹에서 제거하고, 빈 그룹은 통째로 제거
  let removed = 0;
  const kept = groups
    .map((g) => {
      const before = (g.hooks || []).length;
      const hooks = (g.hooks || []).filter((h) => !isOurs(h.command));
      removed += before - hooks.length;
      return { ...g, hooks };
    })
    .filter((g) => (g.hooks || []).length > 0);

  settings.hooks.SessionStart = kept;
  if (!kept.length) delete settings.hooks.SessionStart;
  if (settings.hooks && Object.keys(settings.hooks).length === 0) delete settings.hooks;
  save(settings);
  console.log(removed ? `🗑️  자동 실행 해제 완료 (${removed}개 제거).` : '제거할 항목이 없었어요.');
}

function status() {
  const on = alreadyInstalled(load());
  console.log(on ? '자동 실행: 켜짐 ✅' : '자동 실행: 꺼짐 ⭕');
  console.log(`설정 파일: ${SETTINGS}`);
}

const arg = process.argv[2];
if (arg === '--uninstall' || arg === '-u') uninstall();
else if (arg === '--status' || arg === '-s') status();
else install();
