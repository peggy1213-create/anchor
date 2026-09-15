# Anchor

A calm, twice-a-day check-in / check-out companion for self-directed learners.
Desktop app built with Tauri 2, React 18, TypeScript, Tailwind CSS, and Zustand.

## Getting started

Prerequisites: Node.js 18+, pnpm, Rust toolchain.

```bash
pnpm install
pnpm tauri dev
```

To create a production build:

```bash
pnpm tauri build
```

## Where data lives

All data is stored locally on your machine — no cloud, no login.

- **Windows:** `%APPDATA%\anchor\state.json`
- **macOS:** `~/Library/Application Support/anchor/state.json`
- **Linux:** `~/.config/anchor/state.json`

The file is written as JSON and updated on every change (debounced at 500ms).

## Roadmap

### Prompt 2 — Check-in & Check-out flows

- Morning check-in: set up to 3 commitments, name what might be hard, protect one thing
- Evening check-out: reflect on what took your day, one word for how today felt
- Disposition actions: mark done, carry forward, break down, let go
- Weekly timeline view

### Prompt 3 — AI reflective mirror

- Optional weekly AI reflection using the Anthropic API
- Pattern recognition across check-ins and check-outs
- Gentle nudges, never scores or streaks
