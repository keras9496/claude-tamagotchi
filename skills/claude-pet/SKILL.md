---
name: claude-pet
description: Install, set up, launch, update, or remove "Claude Pet" (클로드 키우기) — an open-source, NON-COMMERCIAL desktop pet that visualizes the user's Claude Code token usage as a Tamagotchi-style Claw'd character. Trigger when the user asks to install / set up / launch / update / uninstall "Claude Pet", "클로드 키우기", "클로드 다마고치", or "Claude tamagotchi".
---

# Claude Pet (클로드 키우기) — installer skill

Open-source **non-commercial** desktop pet. Repo: <https://github.com/keras9496/claude-tamagotchi>

It reproduces Anthropic's Claude Code mascot **Claw'd**. This is an unofficial fan
project, not affiliated with or endorsed by Anthropic. Do not use commercially.

When invoked, figure out the user's intent (install / update / launch / uninstall)
and follow the matching section. Keep the user informed; run commands one step at a
time and stop on errors with a clear explanation.

## 0. Prerequisites (always check first)

Run and confirm all three exist:
- `node -v`  (need Node.js 18+)
- `npm -v`
- `git --version`

If any is missing, tell the user to install it first and stop.

## 1. Install (or update)

1. **Install dir** — default `~/claude-tamagotchi`. Ask only if the user wants a
   different location; otherwise use the default. (Let `DIR` = that path.)
2. **Get the code**
   - If `DIR` exists and is a git repo → update: `git -C "DIR" pull --ff-only`
   - Otherwise → clone: `git clone https://github.com/keras9496/claude-tamagotchi.git "DIR"`
3. **Dependencies**: from inside `DIR`, run `npm install`.
4. **Enable auto-launch**: from inside `DIR`, run `npm run autostart`.
   This adds a Claude Code **SessionStart hook** so the pet opens automatically with
   each new Claude Code session. A single-instance lock prevents duplicates.
5. **Launch now** (don't wait for the next session): from inside `DIR`, run
   `node src/launch.js` (it starts the pet detached and returns immediately).
6. **Tell the user**: on first launch a small window appears to pick the **language
   (한국어 / English)** and **name** the pet. After that, click the character to open
   its status panel; feed/play by spending accumulated dev tokens.

> Windows note: if the environment has `ELECTRON_RUN_AS_NODE=1`, unset it before
> launching (`Remove-Item Env:ELECTRON_RUN_AS_NODE` in PowerShell), or the app errors.

## 2. Launch only (already installed)

From inside `DIR`: `node src/launch.js`.

## 3. Check auto-launch status

From inside `DIR`: `npm run autostart:status`.

## 4. Uninstall

1. Disable auto-launch: from inside `DIR`, run `npm run autostart:off`
   (removes the SessionStart hook; leaves the rest of the user's settings intact).
2. Stop any running pet (close it / end the `electron` process).
3. Ask before deleting anything. If the user confirms:
   - delete the app folder `DIR`
   - delete save data at `~/.claude-pet/` (token cache + game save). Note this erases
     the pet's name, language, and progress.

## What gets created (so you can explain it)

- A SessionStart hook entry in `~/.claude/settings.json` (other settings untouched).
- `~/.claude-pet/state.json` — token usage aggregated from `~/.claude/projects/**/*.jsonl`.
- `~/.claude-pet/pet.json` — game save (name, language, food/energy/happiness, …).
