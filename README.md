# Business Tycoon

Free AI Office Simulator Game by [TeamDay.ai](https://www.teamday.ai)

Build and manage your dream AI startup. Hire AI agents, furnish your office, complete projects, and grow your company from a tiny studio to a tech empire.

## Play

**[Play now](https://teamday-ai.github.io/business-tycoon/)** — runs entirely in your browser, no install needed.

## Features

- Isometric office builder with drag-and-drop furniture
- Hire and manage AI agents with unique skills and personalities
- Complete client projects to earn revenue
- Research new technologies and unlock upgrades
- Dynamic economy with market events
- Multiple office layouts and expansion paths
- Background music and sound effects
- AI CEO advisor for strategic decisions

## Development

This is a vanilla JavaScript game — no build step required. Just serve the files:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .
```

Then open `http://localhost:8000` in your browser.

## Project Structure

```
├── index.html          # Entry point
├── src/
│   ├── main.js         # App bootstrap
│   ├── game.js         # Game loop
│   ├── engine.js       # Core engine
│   ├── config.js       # Game configuration & balance
│   ├── simulation.js   # Business simulation logic
│   ├── economy.js      # Financial systems
│   ├── progression.js  # Level & unlock progression
│   ├── agent.js        # AI agent behavior
│   ├── ai-ceo.js       # AI CEO advisor
│   ├── events.js       # Random events system
│   ├── map.js          # Map & camera
│   ├── floorplan.js    # Office layout
│   ├── build-mode.js   # Construction mode
│   ├── pathfinding.js  # Agent movement
│   ├── recruitment.js  # Hiring system
│   ├── project.js      # Project management
│   ├── rotation.js     # Object rotation
│   ├── visitor.js      # Office visitors
│   ├── audio.js        # Music system
│   ├── sfx.js          # Sound effects
│   ├── renderer/       # Isometric rendering
│   └── ui/             # UI panels & HUD
├── assets/
│   ├── *.mp3           # Background music
│   └── team/           # Agent avatar images
└── og-image.jpg        # Social sharing image
```

## License

MIT
