# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Business Tycoon is a vanilla JavaScript browser game — an isometric AI office simulator. No build step, no bundler, no framework. ES modules are loaded directly by the browser via `<script type="module">`.

## Development

Serve files with any static HTTP server:
```bash
python3 -m http.server 8000
# or
npx serve .
```

There is no build, lint, or test tooling. The game runs entirely client-side.

## Architecture

**Entry flow:** `index.html` → `src/main.js` (bootstrap, game loop) → all other modules

**Core singleton:** `G` in `src/game.js` holds all mutable game state (money, agents, projects, day/week counters, UI flags, etc.). Nearly every module imports `G`.

**Engine (`src/engine.js`):** Canvas setup, camera (pan/zoom), coordinate transforms (`toScreen`/`toTile` for isometric projection), mouse/keyboard input handling.

**Simulation layer:**
- `src/simulation.js` — main per-tick simulation logic (daily/weekly cycles, project spawning, agent work)
- `src/economy.js` — financial calculations (revenue, costs, valuation, MRR, visitor/lead/client pipeline)
- `src/progression.js` — level unlocks, tech tree, company growth stages
- `src/events.js` — random game events (market booms, VC offers, disasters)

**Entity systems:**
- `src/agent.js` — `Agent` class: AI worker behavior, skills, mood, efficiency, pathfinding targets
- `src/visitor.js` — office visitor NPCs
- `src/project.js` — project creation and management
- `src/recruitment.js` — hiring system and candidate generation

**Map & building:**
- `src/map.js` — room placement, corridors, door management
- `src/floorplan.js` — office layout plans and expansion zones
- `src/build-mode.js` — construction UI (room placement, rotation, drag-to-build)
- `src/rotation.js` — furniture/room rotation logic
- `src/pathfinding.js` — A* grid pathfinding for agents

**Rendering (`src/renderer/`):**
- `index.js` — render orchestrator with depth sorting
- `floor.js`, `walls.js`, `furniture.js`, `agents.js`, `effects.js` — layer-specific drawing
- `minimap.js` — minimap overlay
- `primitives.js` — shared isometric drawing helpers

**UI (`src/ui/`):**
- `panels.js` — main UI panels (agent details, project list, company info)
- `build-panel.js` — construction mode panel
- `equipment-panel.js` — office equipment config
- `hud-popover.js` — HUD tooltips
- `speed.js` — game speed controls and keyboard shortcuts
- `toast.js` — notification toasts
- `intro.js` — onboarding/level intro screens
- `cashflow-graph.js`, `floating-chart.js`, `analytics-panel.js` — financial dashboards
- `strategy-panel.js` — strategic decisions UI
- `loan.js` — loan/debt management UI

**Configuration:** `src/config.js` (~70KB) contains all game balance constants, company types, office definitions, furniture catalogs, progression tables, and economy parameters.

**Audio:** `src/audio.js` (background music), `src/sfx.js` (procedural sound effects via Web Audio API). Music files in `assets/*.mp3`.

## Key Patterns

- All rendering uses HTML5 Canvas 2D with isometric projection (tile width/height from `config.js` `TILE_W`/`TILE_H`)
- Game loop in `src/main.js` calls `simulationTick()` then `render()` each frame via `requestAnimationFrame`
- UI is a mix of canvas-drawn elements and DOM overlays (panels are HTML elements positioned over the canvas)
- The `ai-ceo.js` module calls an external AI API for the CEO advisor feature

## AI CEO Agent & EvolC Integration

Business Tycoon is registered on the **EvolC marketplace** as company `ai-office-simulator`. An AI CEO agent manages growth and reports metrics.

**Agent:** `.claude/agents/ceo.md` -- invoke with `claude --agent ceo`

**MCP Config:** `.mcp.json` connects the `evolc-metrics` MCP server (from `/Users/dodo/evolc/packages/mcp/`) with company_id `ai-office-simulator`.

**What the CEO agent does:**
- Tracks player growth, engagement, and retention metrics
- Pushes metrics to EvolC via `push_metrics` (users, growth rate, session data)
- Reports milestones and events via `push_event` (player milestones, launches, viral moments)
- Monitors SEO for game discovery keywords via Ahrefs
- Tests the live game via Chrome DevTools MCP
- Provides actionable growth recommendations

**Key metrics tracked:**
- Players: total, MAU, DAU, growth rate
- Engagement: session duration, return rate, game completion rate
- SEO: keyword rankings, backlinks, organic traffic for tycoon.teamday.ai
- Virality: shares, referrals, social mentions

**Important reminders:**
- Vanilla JS, no build step -- changes deploy via GitHub Pages on push to main
- No backend -- all game state is client-side (localStorage)
- Dev server: `python3 -m http.server 8000` or `npx serve .` (never start automatically)
- Analytics via Umami and/or Fathom (check index.html for current setup)
