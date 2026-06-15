// 수집기: ~/.claude/projects/**/*.jsonl 의 토큰 사용량을 집계해
// ~/.claude-pet/state.json 으로 써준다. 펫 GUI는 이 파일만 읽으면 된다.
//
// electron 의존성이 전혀 없어서 `node src/collector.js` 로 단독 실행/테스트 가능.

const fs = require('fs');
const os = require('os');
const path = require('path');

const PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');
const OUT_DIR = path.join(os.homedir(), '.claude-pet');
const OUT_FILE = path.join(OUT_DIR, 'state.json');

// 안 바뀐 파일을 다시 안 읽으려고 파일별 집계 결과를 캐시 (mtime+size 키)
const fileCache = new Map();

function localDay(ms) {
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function listJsonl(dir) {
  const out = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listJsonl(full));
    else if (e.isFile() && e.name.endsWith('.jsonl')) out.push(full);
  }
  return out;
}

// 파일 하나 → { byDay: {YYYY-MM-DD: outputTokens}, total, maxTs, model }
function aggregateFile(file) {
  const stat = fs.statSync(file);
  const cached = fileCache.get(file);
  if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
    return cached;
  }

  const byDay = {};
  let total = 0, maxTs = 0, model = null;
  const content = fs.readFileSync(file, 'utf8');

  for (const line of content.split('\n')) {
    if (!line || line.indexOf('"usage"') === -1) continue;
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }

    const usage = (obj.message && obj.message.usage) || obj.usage;
    const ts = obj.timestamp;
    if (!usage || !ts) continue;

    const out = usage.output_tokens || 0;
    const tms = Date.parse(ts);
    if (Number.isNaN(tms)) continue;

    const day = localDay(tms);
    byDay[day] = (byDay[day] || 0) + out;
    total += out;
    if (tms > maxTs) {
      maxTs = tms;
      model = (obj.message && obj.message.model) || obj.model || model;
    }
  }

  const result = { mtimeMs: stat.mtimeMs, size: stat.size, byDay, total, maxTs, model };
  fileCache.set(file, result);
  return result;
}

function collect() {
  const files = listJsonl(PROJECTS_DIR);
  const byDay = {};
  let total = 0, maxTs = 0, model = null;

  for (const f of files) {
    let agg;
    try { agg = aggregateFile(f); } catch { continue; }
    for (const d in agg.byDay) byDay[d] = (byDay[d] || 0) + agg.byDay[d];
    total += agg.total;
    if (agg.maxTs > maxTs) { maxTs = agg.maxTs; model = agg.model || model; }
  }

  const todayKey = localDay(Date.now());
  return {
    tokensToday: byDay[todayKey] || 0,
    tokensTotal: total,
    lastActiveISO: maxTs ? new Date(maxTs).toISOString() : null,
    model: model || 'claude',
    scannedFiles: files.length,
  };
}

function writeState() {
  const s = collect();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(s, null, 2));
  return s;
}

module.exports = { collect, writeState, OUT_FILE };

// 단독 실행 시: 한 번 집계해서 출력 + 파일로 저장
if (require.main === module) {
  const s = writeState();
  console.log(JSON.stringify(s, null, 2));
  console.error(`\n→ ${OUT_FILE} 저장 완료 (파일 ${s.scannedFiles}개 스캔)`);
}
