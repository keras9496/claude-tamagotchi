# 🟠 클로드 키우기 (Claude Pet)

**한국어** · [English](README.en.md)

> **오픈소스 · 비상업 전용(CC BY-NC 4.0)** · Anthropic 의 마스코트 **Claw'd** 를 사용하는 **비공식 팬 프로젝트**
> (Open source · **NON-COMMERCIAL only** · Unofficial fan project — not affiliated with or endorsed by Anthropic)

클로드 코드(Claude Code)의 토큰 사용량을 **음식과 활동량**으로 형상화해 키우는 데스크톱 펫.
바탕화면 위를 돌아다니는 클로드 캐릭터를 클릭하면 현재 사용량/기분을 보여줍니다.

> 개발을 많이 하면 클로드가 열심히 일하고(✨working), 며칠 안 하면 굶어서 축 늘어집니다(🥺hungry).

---

## 🚀 설치 — 제일 쉬운 방법 (Claude Code 에게 부탁하기)

명령어를 외울 필요 없습니다. **Claude Code 를 열고, 아래 문장을 복사해서 그대로 붙여넣고 보내기만** 하세요 👇

```text
https://github.com/keras9496/claude-tamagotchi 이 저장소를 클론해서
README 안내대로 "클로드 키우기"를 설치하고 실행해줘.
```

이러면 Claude Code 가 알아서 **내려받기 → 설치 → (Claude Code 켤 때) 자동 실행 등록 → 펫 띄우기** 까지 다 해줍니다.
잠시 뒤 바탕화면에 클로가 나타나고, 처음 뜨는 창에서 **언어(한국어/English)와 이름** 만 정하면 끝이에요. 🎉

> 🇺🇸 영어로 부탁하려면 이 문장을 붙여넣으세요:
> ```text
> Clone https://github.com/keras9496/claude-tamagotchi and install "Claude Pet"
> by following its README, then launch it.
> ```

**준비물** — Node.js 18+ 와 git 만 있으면 됩니다. (Claude Code 를 쓰고 있다면 보통 이미 깔려 있어요.)
없더라도 위처럼 부탁하면 Claude Code 가 설치 방법을 알려줍니다. 직접 확인하려면 터미널에서 `node -v`, `git --version`.

> 나중에 지우고 싶으면 Claude Code 에 **"클로드 키우기 삭제해줘"** 라고 하면 자동 실행 해제까지 정리해 줍니다.

---

## 다른 설치 방법

<details>
<summary>📌 <b>방법 B — 스킬로 등록해두기</b> (자주 설치/재설치하는 분)</summary>

&nbsp;

스킬 파일을 한 번만 받아두면, 다음부턴 **"클로드 키우기 설치해줘"** 한마디로 됩니다.

macOS / Linux:
```bash
mkdir -p ~/.claude/skills/claude-pet
curl -fsSL https://raw.githubusercontent.com/keras9496/claude-tamagotchi/main/skills/claude-pet/SKILL.md \
  -o ~/.claude/skills/claude-pet/SKILL.md
```

Windows (PowerShell):
```powershell
New-Item -ItemType Directory -Force "$HOME\.claude\skills\claude-pet" | Out-Null
Invoke-WebRequest -UseBasicParsing `
  https://raw.githubusercontent.com/keras9496/claude-tamagotchi/main/skills/claude-pet/SKILL.md `
  -OutFile "$HOME\.claude\skills\claude-pet\SKILL.md"
```

그다음 Claude Code 에서 **"클로드 키우기 설치해줘"** / `install Claude Pet`.
</details>

<details>
<summary>🛠 <b>방법 C — 직접 설치</b> (개발자용)</summary>

&nbsp;

```bash
git clone https://github.com/keras9496/claude-tamagotchi.git
cd claude-tamagotchi
npm install
npm start          # 펫이 바탕화면에 등장
npm run autostart  # (선택) Claude Code 켤 때 자동 실행 등록
```
</details>

---

## 첫 실행에 일어나는 일

1. 작은 창이 떠서 **언어(한국어/English)** 를 고르고 **이름**을 지어줍니다.
2. 이름을 지으면 클로가 바탕화면 아래를 걸어 다닙니다.
3. **클릭**하면 상태창(행복도/밥/체력/먹이 포인트)이 열립니다.
4. 개발로 쌓인 **먹이 포인트**로 밥/놀이를 주며 키웁니다.

선택한 언어와 이름은 `~/.claude-pet/pet.json` 에 저장되고, 이후 모든 문구가 그 언어로 표시됩니다.

> ⚠️ 혹시 실행이 안 되고 `Cannot read properties of undefined (reading 'handle')` 에러가 나면
> 환경변수 `ELECTRON_RUN_AS_NODE` 때문입니다. 해제 후 다시 실행하세요:
> macOS/Linux `unset ELECTRON_RUN_AS_NODE && npm start` · Windows `Remove-Item Env:ELECTRON_RUN_AS_NODE; npm start`

---

## 자동 실행 (Claude Code 와 함께 켜기)

Claude Code 의 **SessionStart 훅**에 펫 런처를 등록해, 세션을 시작할 때마다 펫이 자동으로 함께 뜨게 합니다.
단일 인스턴스 락 덕분에 여러 세션을 열어도 펫은 **항상 하나만** 실행됩니다.

```bash
npm run autostart          # 등록 (~/.claude/settings.json 의 hooks.SessionStart 에 추가)
npm run autostart:status   # 현재 상태 확인
npm run autostart:off      # 해제
```

- `src/launch.js` — 펫을 백그라운드로 분리 실행(detached)하고 즉시 종료해 세션 시작을 막지 않음.
- `src/install.js` — 위 훅을 settings.json 에 멱등(idempotent)하게 등록/해제. 기존 설정은 보존합니다.

## 조작

- **캐릭터 클릭** → 말풍선 + 상태창(행복도 / 밥 / 체력 / 먹이 포인트 / 오늘 활동 / 누적 토큰) 토글
- 상태창은 다른 곳을 클릭하면 닫힙니다.
- **상태가 나빠지면 스스로 말풍선**을 띄웁니다 — 밥이 줄면 *출출해요 → 배고파요*, 체력이 줄면 *심심해요 → 기운이 없어요*. (회복되면 조용해짐)

## 구조

```
claude-tamagotchi/
├── skills/
│   └── claude-pet/SKILL.md   Claude Code 설치 스킬 (배포용)
├── src/
│   ├── main.js      Electron 메인: 펫 창 · 산책 · 상태창 · 이름창 · 단일인스턴스 · IPC
│   ├── collector.js ~/.claude/projects/**/*.jsonl 집계 → state.json (60초마다)
│   ├── state.js     게임 상태 매니저: 밥/체력 감쇠 · 먹이 포인트 · feed()/play()/setName()
│   ├── i18n.js      다국어 문자열 테이블(ko/en) — 사용자 노출 문구 일원화
│   ├── launch.js    펫을 분리 실행하는 런처 (SessionStart 훅이 호출)
│   ├── install.js   자동 실행 훅 등록/해제기 (npm run autostart)
│   ├── preload.js   렌더러 ↔ 메인 안전 브리지 (+ 문자열 테이블 노출)
│   ├── pet.*        Claw'd 픽셀 스프라이트 창 (걷기/기분/먹이 반응)
│   ├── name.*       첫 실행 언어 선택 + 이름 짓기 창
│   └── status.*     상태·인터랙션 패널 (게이지 + 밥주기/놀아주기 버튼)
├── package.json
├── LICENSE
└── README.md
```

## 동작 원리

```
[collector.js]  JSONL의 usage·timestamp 집계
      │  쓰기
      ▼
~/.claude-pet/state.json   ← 토큰 사실 (tokensTotal / tokensToday / lastActive)
      │  읽기
      ▼
[state.js]  게임 로직
      │  읽기·쓰기
      ▼
~/.claude-pet/pet.json     ← 게임 세이브 (name / lang / food / energy / happiness …)
```

- **먹이 포인트** = `(현재 누적 − 설치 시점 누적) − 소비량`. 설치 후 사용량만 카운트해서 0부터 쌓임.
- 상태창에서 **밥 주기 / 놀아주기** 시 먹이 포인트를 소비(기본 30K 토큰)해 밥/체력을 채움.
- **10분마다** 밥·체력 중 **랜덤 하나**가 하락(-12).
- **항상 켜둘 필요 없음**: 앱이 꺼져 있던 동안의 변화는, 다시 켤 때 `lastDropISO`/`lastTickISO`(마지막 실행 시점)와 현재 시각을 비교해 **경과 시간만큼 한 번에 계산**한다.
- **행복도(0→100)**
  - **설치 시점에 한 번만** 누적 토큰으로 시작값이 정해짐 (10M 토큰에서 80). 과거 사용 보상은 여기까지.
  - 그 이후엔 **순수 돌봄**: 밥·체력이 **둘 다 가득**이면 시간당 +12로 상승(→100), **둘 다 50 이하**면 하락(→0, 48시간 방치 시).
  - 따라서 과거에 많이 쓴 사람도 **사용을 줄이고 방치하면 행복도가 0까지** 떨어진다.
- **기분**: 밥↓ `hungry` · 체력↓ `tired` · 둘 다 충분 + 오늘 활동량↑ `working` · 그 외 `happy`.

밸런스 상수(감쇠 속도, 회복량, 비용)는 [src/state.js](src/state.js) 상단에서 조정.

## 캐릭터(Claw'd) 및 상표 고지

스프라이트는 Claude Code의 마스코트 **Claw'd**(공식 에셋 `clawd.svg`, 47×38, `#D97757`)를
픽셀 단위로 재현한 것입니다.

- **"Claw'd", "Claude", "Anthropic"** 및 관련 캐릭터·로고·상표의 모든 권리는 **Anthropic** 에 있습니다.
- 본 프로젝트는 Anthropic 과 **무관한 비공식 팬 프로젝트**이며, 후원·보증·제휴를 받지 않았습니다.
  *(Unofficial fan project — not affiliated with, endorsed, or sponsored by Anthropic.)*
- 마스코트를 포함한 본 프로젝트의 **상업적 이용은 허용되지 않습니다.** 재사용 시 Anthropic 브랜드 가이드라인을 확인하세요.

## 라이선스 (License)

본 프로젝트(코드·에셋 전체)는 **CC BY-NC 4.0**(저작자 표시–**비영리**)로 공개되는 **오픈소스**입니다.
열람·수정·재배포는 자유지만 **상업적 이용은 금지**되며, 출처 표기가 필요합니다. 전문은 [LICENSE](LICENSE) 참고.

This project is open source under **CC BY-NC 4.0** — free to use, modify, and share
for **non-commercial** purposes with attribution. **Commercial use is not permitted.**
See [LICENSE](LICENSE). The "Claw'd" character remains the property of Anthropic.
