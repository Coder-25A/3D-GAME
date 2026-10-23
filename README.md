# 3D-GAME: Tode the Frog
[![official JetBrains project](http://jb.gg/badges/official.svg)](https://confluence.jetbrains.com/display/ALL/JetBrains+on+GitHub) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A 3D browser game built using Three.js and Vite, developed for the JetBrains Academy **"Build a Game with an AI Coding Agent"** Challenge.

---

## Game Overview & Features

### Core Mechanics
- **3D Isometric World**: Dual-shade green checkerboard map with obstacle houses and custom ambient/directional lighting.
- **Tode the Frog (Player)**: Grid-based hopping movement with arc physics, camera-aligned directional facing (`WASD` or Arrow keys).
- **Enemy System**: Dynamic enemy tracking, multi-corner spawns, and avoidance physics.
- **Combat Mechanics**: Radial attack ring (<kbd>Space</kbd>) with dynamic range and cooldown.
- **Game Loop**: Real-time score tracking (survival time + kill bonus), collision detection, game over overlay, and instant restart.

---

## Custom Extensions (Challenge Extensions)

Beyond the standard course curriculum, the following features and extensions were designed and implemented:

1. **New Levels & Dynamic Environments**:
   - **Winter / Snow Level**: Custom snowy atmosphere with snowman models, pine trees, and interactive snow weather effects.
   - **Mystical Forest Level**: Lush vegetation featuring twisted trees, flower groups, crystals, bushes, and dragons.
   - **Level Transition System**: Seamless level unlock banner notifications upon reaching score milestones.
2. **Collectibles & Power-Up System**:
   - **Collectible Coins**: Rotating 3D gold coins (`Coin.glb`) spawning across the map awarding score bonuses.
   - **Heart Pickups**: 3D heart items (`Heart.glb`) allowing the player to restore lost health.
   - **Shield Power-Ups**: 3D shields (`Shield.glb`) granting temporary invulnerability / defense against enemy collisions.
3. **Audio & Sound System**:
   - **Jump Sound Effects**: Realistic hop audio triggers (`little-fighter-jump.wav`).
   - **Background Music**: Atmospheric theme (`MysticalForest1.wav`) with integrated audio management.
4. **Enhanced UI & Character Select**:
   - **Modern Main Menu**: Polished start screen with instructions and play button.
   - **Character Selection**: Choose between classic Tode and Yellow Frog (`YellowFrog.glb`).
   - **HUD Overhaul**: Visual counters for Health, Shield, Coins, and Score.

---

## Quick Start & Build Instructions

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### Installation & Running Locally

1. Navigate to the `game` directory:
   ```bash
   cd game
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

4. Build for production:
   ```bash
   npm run build
   ```
   To preview the production build:
   ```bash
   npm run preview
   ```

---

## Third-Party Assets & Credits (Clause 9(e) Disclosure)

All third-party assets used in this project are licensed under permissive open licenses (Public Domain / CC0 / CC-BY) that permit modification, distribution, and commercial use:

| Asset Name | Creator / Source | License | Notes |
| :--- | :--- | :--- | :--- |
| **Bush with Flowers** | Quaternius ([quaternius.com](https://quaternius.com)) | CC0 / Public Domain | 3D Model |
| **Coin** | Quaternius ([quaternius.com](https://quaternius.com)) | CC0 / Public Domain | 3D Model |
| **Crystal** | iPoly3D via Poly Pizza | CC-BY | 3D Model |
| **Dragon** | Quaternius ([quaternius.com](https://quaternius.com)) | CC0 / Public Domain | 3D Model |
| **Flower Group** | Quaternius ([quaternius.com](https://quaternius.com)) | CC0 / Public Domain | 3D Model |
| **Grass Yellowing** | Steve B via Poly Pizza | CC-BY | 3D Model |
| **Frog (Base)** | Poly by Google via Poly Pizza | CC-BY | 3D Model |
| **Yellow Frog** | AssetQuest | CC-BY | 3D Model |
| **Shield** | Quaternius ([quaternius.com](https://quaternius.com)) | CC0 / Public Domain | 3D Model |
| **Snowman** | Taiga Yonemoto via Poly Pizza | CC-BY | 3D Model |
| **Pinetree** | Quaternius ([quaternius.com](https://quaternius.com)) | CC0 / Public Domain | 3D Model |
| **Twisted Tree / Trees** | Quaternius ([quaternius.com](https://quaternius.com)) | CC0 / Public Domain | 3D Model |
| **Spider** | Quaternius ([quaternius.com](https://quaternius.com)) | CC0 / Public Domain | 3D Model |
| **Mountain** | Geoff Bentley via Poly Pizza | CC-BY | 3D Model |
| **Heart** | Quaternius ([quaternius.com](https://quaternius.com)) | CC0 / Public Domain | 3D Model |
| **Jump Sound Effect** | tailssonic via Freesound (`686986`) | CC-BY / Creative Commons | Audio SFX |
| **Mystical Forest BGM** | Royalty-Free Audio Archive | CC0 / Permissive Game Audio | Background Music |

---

## AI Tools Disclosure (Clause 9(f) Disclosure)

In compliance with Clause 9(f) of the Challenge Terms and Conditions, the following AI tools and coding assistants were utilized during the development of this submission:

- **JetBrains AI Assistant / Antigravity AI Coding Agent**: Used for architectural scaffolding, code logic implementation (audio manager, pickup collision math, dynamic level generation), CSS styling, refactoring, and automated testing across the project.
- All gameplay design decisions, creative asset curation, testing, and direction reflect the author's own judgment, effort, and creative input.

---

## License

This project is licensed under the [MIT License](LICENSE). Copyright (c) 2025 JetBrains Academy.
