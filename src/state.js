// 게임 상태 매니저.
//  - 토큰 사실(state.json): collector.js 가 써줌 (tokensTotal/tokensToday/lastActive...)
//  - 게임 세이브(pet.json): 밥/체력/행복도/소비한토큰. 이 모듈이 관리.
//
// 먹이 포인트 = tokensTotal - consumedTokens  (개발할수록 늘고, 먹이주면 줄어듦)

const fs = require('fs');
const os = require('os');
const path = require('path');
const { pack } = require('./i18n');

const DIR = path.join(os.homedir(), '.claude-pet');
const TOKENS_FILE = path.join(DIR, 'state.json'); // collector 출력
const SAVE_FILE = path.join(DIR, 'pet.json');     // 게임 세이브

// ── 밸런스 상수 ───────────────────────────────────────────
const MAX = 100;
const FEED_COST = 30000;  // 밥 1회 토큰 비용
const FEED_GAIN = 28;     // 밥 1회 회복량
const PLAY_COST = 30000;  // 놀이 1회 토큰 비용
const PLAY_GAIN = 28;     // 체력 1회 회복량

const DROP_TICK_MS = 10 * 60 * 1000; // 10분마다
const DROP_AMOUNT = 12;              // 랜덤으로 하나 하락량
const FULL_AT = 99;                  // 이 이상이면 '가득'으로 간주
const LOW_AT = 50;                   // 이 이하 둘 다면 방치
const HAPPY_UP_PER_H = 12;           // 둘 다 가득일 때 시간당 행복도 상승 (0→100 약 8시간)
const HAPPY_DOWN_PER_H = 100 / 48;   // 둘 다 50 이하일 때 시간당 하락 (48시간 방치 시 100→0)

// 누적 토큰 → '초기 행복도'. 설치 시점에 단 1회만 반영(이후엔 영향 없음).
// 과거에 많이 쓴 사람은 높은 행복도로 시작하지만, 그 뒤 방치하면 0까지 떨어진다.
const HAPPY_INIT_MAX = 80;             // 누적 토큰만으로 도달 가능한 시작 행복도 상한
const TOKENS_FOR_INIT_MAX = 10_000_000; // 이 누적 토큰이면 초기 행복도 = HAPPY_INIT_MAX

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ── 토큰 사실 읽기 (collector 출력 or mock) ───────────────
function readTokens() {
  try {
    const r = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
    return {
      tokensTotal: r.tokensTotal || 0,
      tokensToday: r.tokensToday || 0,
      lastActiveISO: r.lastActiveISO || null,
      model: r.model || 'claude',
      live: true,
    };
  } catch {
    return { tokensTotal: 0, tokensToday: 0, lastActiveISO: null, model: 'claude', live: false };
  }
}

// ── 게임 세이브 ───────────────────────────────────────────
function loadSave() {
  const nowISO = new Date().toISOString();
  try {
    const s = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8'));
    return {
      name: s.name ?? null,                        // 사용자가 지어준 이름 (없으면 null)
      lang: s.lang ?? 'ko',                        // 표시 언어 ('ko' | 'en')
      food: s.food ?? 70,
      energy: s.energy ?? 70,
      happiness: s.happiness ?? 0,
      consumedTokens: s.consumedTokens ?? 0,
      installBaseline: s.installBaseline ?? null, // 설치 시점 누적 토큰 (구버전 호환/마이그레이션용)
      earnedTokens: s.earnedTokens ?? 0,          // 설치 후 적립한 토큰(단조 증가, 로그 정리에도 안 줄어듦)
      lastSeenTotal: s.lastSeenTotal ?? null,     // 마지막으로 관측한 tokensTotal (델타 계산 기준)
      clickCount: s.clickCount ?? 0,              // 현재 10분 구간의 클릭 수 (대사 단계 결정)
      clickBucket: s.clickBucket ?? 0,            // 클릭 수를 센 10분 버킷(바뀌면 리셋)
      lastDropISO: s.lastDropISO || nowISO,
      lastTickISO: s.lastTickISO || nowISO,
    };
  } catch {
    return { name: null, lang: 'ko', food: 70, energy: 70, happiness: 0, consumedTokens: 0, installBaseline: null, earnedTokens: 0, lastSeenTotal: null, clickCount: 0, clickBucket: 0, lastDropISO: nowISO, lastTickISO: nowISO };
  }
}

function persist(s) {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(SAVE_FILE, JSON.stringify(s, null, 2));
  } catch (_) {}
}

// 행복도: 둘 다 가득→상승, 둘 다 50이하→하락, 그 외 유지
function tickHappiness(s, dtMs) {
  const hrs = dtMs / 3.6e6;
  if (s.food >= FULL_AT && s.energy >= FULL_AT) {
    s.happiness = clamp(s.happiness + HAPPY_UP_PER_H * hrs, 0, MAX);
  } else if (s.food <= LOW_AT && s.energy <= LOW_AT) {
    s.happiness = clamp(s.happiness - HAPPY_DOWN_PER_H * hrs, 0, MAX);
  }
}

function dropRandom(s) {
  if (Math.random() < 0.5) s.food = clamp(s.food - DROP_AMOUNT, 0, MAX);
  else s.energy = clamp(s.energy - DROP_AMOUNT, 0, MAX);
}

// 누적 토큰 → 설치 시점 초기 행복도
function initialHappiness(tokensTotal) {
  return clamp((tokensTotal / TOKENS_FOR_INIT_MAX) * HAPPY_INIT_MAX, 0, HAPPY_INIT_MAX);
}

// 토큰 적립: tokensTotal 의 '증가분'만 누적한다.
// collector 의 tokensTotal 은 Claude Code 가 오래된 세션 로그를 정리하면 줄어들 수 있어
// 단조 증가가 아니다. 그래서 (현재합 - 설치기준선) 방식은 합이 기준선 밑으로 내려가면
// 영원히 0이 되는 버그가 있었다. 대신 관측될 때마다 양(+)의 델타만 적립하면
// 로그가 정리돼도 적립분이 보존된다.
function accrue(s, tok) {
  if (s.lastSeenTotal == null) {
    // 최초 적립 초기화.
    if (s.installBaseline != null) {
      // 구버전(installBaseline 방식) 세이브 마이그레이션.
      // 정상 상태면 legacy = 설치 후 벌어둔 양. 로그 정리로 합이 기준선 밑이면 legacy=0 이라
      // 최소한 '오늘 생성분'은 살려준다. consumedTokens 를 더해 두면 avail 이 그만큼 복원된다.
      const legacy = Math.max(0, tok.tokensTotal - s.installBaseline);
      s.earnedTokens = s.consumedTokens + Math.max(legacy, tok.tokensToday || 0);
    } else {
      s.earnedTokens = s.earnedTokens || 0;
    }
    s.lastSeenTotal = tok.tokensTotal;
    return;
  }
  const delta = tok.tokensTotal - s.lastSeenTotal;
  if (delta > 0) s.earnedTokens = (s.earnedTokens || 0) + delta;
  // delta < 0 (로그 정리로 합 감소): 적립 유지, 관측 기준만 갱신
  s.lastSeenTotal = tok.tokensTotal;
}

// 적립 - 소비 = 먹이 포인트
function avail(s) {
  return Math.max(0, (s.earnedTokens || 0) - s.consumedTokens);
}

// 경과 시간 시뮬레이션: 10분 틱마다 랜덤 하락 + 행복도(돌봄 + 누적토큰 바닥)
function simulate(s, tok) {
  // 토큰 적립(설치 후 증가분 누적). 첫 실행/구버전 마이그레이션도 여기서 처리.
  accrue(s, tok);

  // 설치(첫 실행) 시점 1회: 기준선 + 누적 토큰 기반 초기 행복도 고정.
  // 이후로는 누적 토큰이 행복도에 직접 관여하지 않는다(순수 돌봄).
  if (s.installBaseline == null) {
    s.installBaseline = tok.tokensTotal;
    s.happiness = initialHappiness(tok.tokensTotal);
  }

  const now = Date.now();

  // 10분 단위 랜덤 하락 (스케줄은 lastDropISO 로 누적)
  let lastDrop = Date.parse(s.lastDropISO) || now;
  let guard = 0;
  while (now - lastDrop >= DROP_TICK_MS && guard++ < 100000) {
    dropRandom(s);
    lastDrop += DROP_TICK_MS;
  }
  s.lastDropISO = new Date(lastDrop).toISOString();

  // 돌봄 기반 행복도(실제 경과 시간만큼 적분)
  const lastTick = Date.parse(s.lastTickISO) || now;
  tickHappiness(s, Math.max(0, now - lastTick));
  s.lastTickISO = new Date(now).toISOString();
  s.happiness = clamp(s.happiness, 0, MAX);

  return s;
}

// ── 기분/메시지 ───────────────────────────────────────────
function deriveMood(food, energy, tokensToday) {
  if (food <= 25) return 'hungry';
  if (energy <= 25) return 'tired';
  if (food >= 55 && tokensToday >= 50000) return 'working';
  return 'happy';
}

function pickMessage(mood, seed, lang) {
  const list = pack(lang).messages[mood];
  return list[Math.abs(Math.floor(seed)) % list.length];
}

// 누적 클릭 수 → 대사 단계. 초반엔 키워달라는 부탁, 많이 클릭하면 일하라는 핀잔.
function pickChatter(count, lang) {
  const c = pack(lang).chatter;
  const stage = count <= 5 ? c.early : count <= 15 ? c.mid : c.late;
  return stage[Math.floor(Math.random() * stage.length)];
}

// 세이브 + 토큰 → GUI 표준 상태
function build(s, tok) {
  const available = avail(s);
  const mood = deriveMood(s.food, s.energy, tok.tokensToday);
  return {
    name: s.name || "Claw'd", // 이름 미설정이면 기본값
    named: !!s.name,          // 이름을 지었는지 (첫 실행 네이밍 안내용)
    lang: s.lang || 'ko',     // 렌더러가 이 값으로 문구를 localize
    food: Math.round(s.food),
    energy: Math.round(s.energy),
    happiness: Math.round(s.happiness),
    availablePoints: available,
    canFeed: available >= FEED_COST,
    canPlay: available >= PLAY_COST,
    feedCost: FEED_COST,
    playCost: PLAY_COST,
    tokensToday: tok.tokensToday,
    tokensTotal: tok.tokensTotal,
    lastActiveISO: tok.lastActiveISO,
    model: tok.model,
    source: tok.live ? 'live' : 'mock',
    mood,
    message: pickMessage(mood, (s.food + s.energy + tok.tokensToday), s.lang),
  };
}

// ── 공개 API ──────────────────────────────────────────────
function getState() {
  const tok = readTokens();
  const s = simulate(loadSave(), tok);
  persist(s);
  return build(s, tok);
}

function feed() {
  const tok = readTokens();
  const s = simulate(loadSave(), tok);
  if (avail(s) < FEED_COST) { persist(s); return { ok: false, reason: 'no_points', ...build(s, tok) }; }
  s.consumedTokens += FEED_COST;
  s.food = clamp(s.food + FEED_GAIN, 0, MAX);
  persist(s);
  return { ok: true, action: 'feed', ...build(s, tok) };
}

function play() {
  const tok = readTokens();
  const s = simulate(loadSave(), tok);
  if (avail(s) < PLAY_COST) { persist(s); return { ok: false, reason: 'no_points', ...build(s, tok) }; }
  s.consumedTokens += PLAY_COST;
  s.energy = clamp(s.energy + PLAY_GAIN, 0, MAX);
  persist(s);
  return { ok: true, action: 'play', ...build(s, tok) };
}

// 이름 짓기/바꾸기 + 언어 설정. 빈 이름이면 무시(기존 유지). 최대 20자.
function setName(name, lang) {
  const clean = String(name || '').trim().slice(0, 20);
  const tok = readTokens();
  const s = simulate(loadSave(), tok);
  if (clean) s.name = clean;
  if (lang === 'ko' || lang === 'en') s.lang = lang;
  persist(s);
  return { ok: !!clean, ...build(s, tok) };
}

// 클릭(쓰다듬기): 클릭 수를 1 올리고 단계에 맞는 대사를 돌려준다.
// 클릭 수는 10분(DROP_TICK_MS) 버킷마다 리셋 → 한참 만에 다시 만지면 초반 대사부터.
function talk() {
  const tok = readTokens();
  const s = simulate(loadSave(), tok);
  const bucket = Math.floor(Date.now() / DROP_TICK_MS);
  if (s.clickBucket !== bucket) { s.clickCount = 0; s.clickBucket = bucket; }
  s.clickCount = (s.clickCount || 0) + 1;
  persist(s);
  return { line: pickChatter(s.clickCount, s.lang), clickCount: s.clickCount };
}

module.exports = { getState, feed, play, setName, talk };
