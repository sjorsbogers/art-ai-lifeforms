# Architecture

## Folder structure

```
/
├── CLAUDE.md              ← Claude Code project instructions
├── CHANGELOG.md           ← project-wide changelog
├── README.md              ← public overview
├── .gitignore
├── core/                  ← shared engine (extracted on demand)
│   ├── README.md
│   ├── css/               ← shared styles (dark terminal aesthetic)
│   └── js/                ← shared JS modules
├── docs/                  ← project documentation
│   ├── vision.md          ← design intent and references
│   └── architecture.md    ← this file
└── lifeforms/             ← one subdirectory per lifeform
    └── 01-pin-grid/       ← Lifeform 01: Pin Grid
        ├── README.md
        ├── CHANGELOG.md
        ├── index.html
        ├── css/
        └── js/
```

---

## Lifeform naming

`lifeforms/XX-short-name/` — zero-padded two-digit number + kebab-case description.

Examples:
- `lifeforms/01-pin-grid/`
- `lifeforms/02-soundscape/`
- `lifeforms/03-pixel-dream/`

---

## Core extraction policy

Code moves to `core/` only when:
1. Two or more lifeforms need it
2. The interface is stable

Do not extract prematurely. Duplication across lifeforms is acceptable until patterns are proven.

---

## Tech philosophy

- No bundler, no npm required for vanilla JS lifeforms
- Lifeforms with a build step get their own `package.json` inside their directory — no root-level lock file
- Dependencies stay local to each lifeform
- `core/` modules are plain JS files, no build step, imported via `<script>` tags
