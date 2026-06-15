# 🟠 Claude Pet (클로드 키우기)

[한국어](README.md) · **English**

> **Open source · NON-COMMERCIAL only (CC BY-NC 4.0)** · An **unofficial fan project** that uses
> Anthropic's mascot **Claw'd** — not affiliated with or endorsed by Anthropic.

A desktop pet that turns your **Claude Code token usage** into food and activity to raise a little
Claude character. It walks around your desktop; click it to see your current usage and its mood.

> Code a lot and Claude works hard (✨working); neglect it for days and it gets hungry and droopy (🥺hungry).

---

## Prerequisites

Make sure these are installed first (a version number printed in your terminal means you're good):

| Needed | Check | If missing |
|---|---|---|
| **Node.js 18+** | `node -v` | Install the LTS from <https://nodejs.org> |
| **git** | `git --version` | Install from <https://git-scm.com> |
| **Claude Code** | `claude --version` | Needed only for the skill install (option 1) |

> Works on Windows, macOS, and Linux. Windows examples use PowerShell.

---

## Installation

### ① Easiest — the Claude Code skill (recommended)

Install the skill once, then just **ask Claude Code** to set everything up.

**Step 1. Download the skill file (one time)**

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

**Step 2. Ask Claude Code**

Open Claude Code and say:

> **"install Claude Pet"**  (or, in Korean, `클로드 키우기 설치해줘`)

The skill then **clones the repo → runs `npm install` → registers auto-launch → starts the pet** for you.
To remove it, say **"uninstall Claude Pet"** and the skill will walk you through disabling auto-launch.

### ② Manual install

```bash
git clone https://github.com/keras9496/claude-tamagotchi.git
cd claude-tamagotchi
npm install
npm start          # the pet appears on your desktop
npm run autostart  # (optional) launch automatically with Claude Code
```

### What happens on first launch

1. A small window asks you to pick a **language (한국어 / English)** and **name** the pet.
2. Once named, Claw'd walks along the bottom of your screen.
3. **Click** it to open the status panel (happiness / food / energy / feed points).
4. Spend the **feed points** earned from your dev activity to feed and play with it.

Your chosen language and name are saved to `~/.claude-pet/pet.json`; all UI text follows that language.

> ⚠️ If the env var `ELECTRON_RUN_AS_NODE=1` is set, Electron runs as plain Node and throws
> `Cannot read properties of undefined (reading 'handle')`. Unset it first:
> - macOS/Linux: `unset ELECTRON_RUN_AS_NODE && npm start`
> - Windows (PowerShell): `Remove-Item Env:ELECTRON_RUN_AS_NODE; npm start`

---

## Auto-launch (start with Claude Code)

Registers the pet's launcher as a Claude Code **SessionStart hook**, so the pet opens automatically with
every new session. A single-instance lock means **only one pet ever runs**, no matter how many sessions you open.

```bash
npm run autostart          # register (adds to hooks.SessionStart in ~/.claude/settings.json)
npm run autostart:status   # check current status
npm run autostart:off      # remove
```

- `src/launch.js` — starts the pet detached and returns immediately, so it never blocks session start.
- `src/install.js` — idempotently adds/removes the hook in settings.json, leaving your other settings intact.

## Interaction

- **Click the character** → speech bubble + status panel (happiness / food / energy / feed points / today / total tokens).
- The status panel closes when you click elsewhere.
- **When it gets needy it speaks up on its own** — low food: *peckish → hungry*; low energy: *bored → no energy left*. (Goes quiet once recovered.)

## Project layout

```
claude-tamagotchi/
├── skills/
│   └── claude-pet/SKILL.md   Claude Code install skill (for distribution)
├── src/
│   ├── main.js      Electron main: pet window · walking · status · name window · single-instance · IPC
│   ├── collector.js aggregates ~/.claude/projects/**/*.jsonl → state.json (every 60s)
│   ├── state.js     game state: food/energy decay · feed points · feed()/play()/setName()
│   ├── i18n.js      ko/en string table — single source for all user-facing text
│   ├── launch.js    detached launcher (called by the SessionStart hook)
│   ├── install.js   auto-launch hook register/unregister (npm run autostart)
│   ├── preload.js   renderer ↔ main bridge (+ exposes the string table)
│   ├── pet.*        Claw'd pixel sprite window (walk / mood / eat reactions)
│   ├── name.*       first-run language picker + naming window
│   └── status.*     status & interaction panel (gauges + feed/play buttons)
├── package.json
├── LICENSE
└── README.md
```

## How it works

```
[collector.js]  sums usage + timestamps from JSONL
      │  writes
      ▼
~/.claude-pet/state.json   ← token facts (tokensTotal / tokensToday / lastActive)
      │  reads
      ▼
[state.js]  game logic
      │  reads/writes
      ▼
~/.claude-pet/pet.json     ← game save (name / lang / food / energy / happiness …)
```

- **Feed points** = `(current total − total at install) − spent`. Only post-install usage counts, starting from 0.
- **Feed / Play** spend feed points (30K tokens each by default) to refill food/energy.
- **Every 10 minutes** one of food/energy randomly drops (−12).
- **No need to keep it running**: time spent while the app was closed is caught up on next launch by comparing
  `lastDropISO`/`lastTickISO` (last run) with the current time — applied all at once.
- **Happiness (0→100)**
  - Set **once at install** from cumulative tokens (80 at 10M). That's the only effect of past usage.
  - After that it's **pure care**: when food & energy are **both full** it rises +12/h (→100); when **both ≤50** it falls (→0 over 48h of neglect).
  - So even a past heavy user will see happiness drop to 0 if they cut back and neglect the pet.
- **Mood**: low food → `hungry`, low energy → `tired`, both fine + active today → `working`, otherwise → `happy`.

Balance constants (decay rate, recovery, cost) live at the top of [src/state.js](src/state.js).

## Claw'd character & trademark notice

The sprite is a pixel-for-pixel reproduction of Claude Code's mascot **Claw'd**
(official asset `clawd.svg`, 47×38, `#D97757`).

- All rights to **"Claw'd", "Claude", "Anthropic"** and related characters/logos/trademarks belong to **Anthropic**.
- This is an **unofficial fan project**, not affiliated with, endorsed by, or sponsored by Anthropic.
- **Commercial use of this project (including the mascot) is not permitted.** Review Anthropic's brand guidelines before reusing.

## License

This project (all code and assets) is **open source under CC BY-NC 4.0** (Attribution–**NonCommercial**).
You may use, modify, and share it for **non-commercial** purposes with attribution; **commercial use is not permitted**.
See [LICENSE](LICENSE). The "Claw'd" character remains the property of Anthropic.
