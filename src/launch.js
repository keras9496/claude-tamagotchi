// 펫을 백그라운드로 한 번 띄우고 즉시 빠져나오는 런처.
// Claude Code 의 SessionStart 훅이 이 파일을 호출한다 (install.js 가 등록).
//   - detached + unref 로 부모(훅/세션)와 수명을 분리 → 세션이 끝나도 펫은 유지
//   - main.js 의 단일 인스턴스 락이 중복 실행을 막아줌 → 매 세션 호출돼도 안전
//
//   node src/launch.js

const { spawn } = require('child_process');
const path = require('path');

const appDir = path.join(__dirname, '..');

// require('electron') 를 일반 node 에서 호출하면 electron 실행 파일 경로 문자열을 돌려준다.
let electronPath;
try {
  electronPath = require('electron');
  if (typeof electronPath !== 'string') electronPath = 'electron';
} catch (_) {
  electronPath = 'electron';
}

// 자식(=electron)이 일반 node 처럼 켜지지 않도록 이 변수는 제거하고 넘긴다.
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

try {
  const child = spawn(electronPath, [appDir], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env,
  });
  child.unref();
} catch (_) {
  // 펫을 못 띄워도 세션 시작을 막지 않는다.
}

process.exit(0);
