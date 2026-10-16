# 3D-GAME: Tode the Frog
[![official JetBrains project](http://jb.gg/badges/official.svg)](https://confluence.jetbrains.com/display/ALL/JetBrains+on+GitHub) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A 3D playable browser game built using Three.js and Vite.

## Game Features
- **3D Isometric World**: Dual-shade green checkerboard map with obstacle houses and custom lighting.
- **Tode the Frog (Player)**: Grid-based hopping movement with arc physics, camera-aligned directional facing (Arrow keys / WASD).
- **Enemy System**: Dynamic enemy tracking, multi-corner spawns, and avoidance physics.
- **Combat Mechanics**: Radial attack ring (<kbd>Space</kbd>) with dynamic range and cooldown.
- **Core Game Loop**: Collision detection triggering Game Over overlay, restart mechanics, and score tracking (survival time + kill bonus).
- **Dynamic Difficulty**: Real-time difficulty scaling with continuous enemy spawning based on your score.

## Quick Start

1. Navigate to the game directory:
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
   Or build and preview:
   ```bash
   npm run build
   node server.cjs
   ```
4. Open [http://localhost:5173](http://localhost:5173) in your browser.
