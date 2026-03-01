# ART — AI Lifeforms

A series of browser-based AI art experiments exploring machine identity, embodiment, and self-discovery.

Inspired by Cyrus Clarke's *I Gave an AI a Body* and the MIT Media Lab inFORM shape display.

---

## Project structure

```
/
├── CLAUDE.md          ← this file
├── CHANGELOG.md       ← project-wide changelog
├── README.md          ← public project overview
├── .gitignore
├── core/              ← shared engine (pin grid, gesture base, identity model)
├── docs/              ← design references, architecture notes, vision
└── lifeforms/         ← each lifeform is a self-contained subdirectory
    └── 01-pin-grid/   ← Lifeform 01: Pin Grid (currently at ai-lifeform/)
```

---

## Running a lifeform

Open the lifeform's `index.html` directly in Chrome or Firefox.
No build step, no server, no npm install.

Requires internet on first load for Three.js CDN. See each lifeform's README for offline instructions.

---

## Adding a new lifeform

1. Create `lifeforms/XX-name/` (zero-padded number + short kebab-case name)
2. Add `index.html`, `README.md`, `CHANGELOG.md`
3. Reference shared code from `core/` if applicable
4. Update root `CHANGELOG.md` and `README.md`

---

## Shared engine (`core/`)

The `core/` directory holds shared utilities lifeforms can reference via `<script src="../../core/js/...">`.
Each module is self-contained with no build dependencies.

Only extract code to `core/` when it's used by 2+ lifeforms and the interface is stable.
Duplication within a single lifeform is fine until patterns are proven.

---

## Tech stack

- Vanilla JS (no bundler, no framework) for shared core and most lifeforms
- Three.js r128 (via CDN or local copy)
- Future lifeforms may use different stacks — each is fully self-contained
- Lifeforms with a build step get their own `package.json` inside their directory

---

## Conventions

- Changelog format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
- Versioning: semantic per lifeform, plus a project-wide version in root `CHANGELOG.md`
- Each lifeform has its own `README.md` and `CHANGELOG.md`
- Directory and file names: `kebab-case`
- JS identifiers: `camelCase`
