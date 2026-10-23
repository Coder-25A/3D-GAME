import './style.css';
import * as THREE from 'three';
import { createCamera } from './components/camera.js';
import { createRenderer } from './components/renderer.js';
import { createPlayer, CHARACTERS } from './components/player.js';
import { createEnemyManager } from './components/Enemy.js';
import { createCoinManager } from './components/Coin.js';
import { createHeartPickupManager } from './components/HeartPickup.js';
import { createShieldPickupManager } from './components/ShieldPickup.js';
import { createMap } from './components/Map.js';
import { createSingleHouse } from './components/House.js';
import { audioManager } from './components/AudioManager.js';
import {
  MIN_COLLISION_DISTANCE,
  HOUSE_COLLISION_RADIUS,
  SCORE_PER_SECOND,
  SCORE_PER_KILL,
  calculateDifficulty,
} from './components/constants.js';

// Raycaster for 3D mouse hover detection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isModelHovered = false;

window.addEventListener('mousemove', (event) => {
  if (gameState !== 'start_screen') return;
  // Convert mouse position to normalized device coordinates (-1 to +1)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd6eaf8);

// Load jump sound effect
audioManager.loadSound('jump', '/sounds/686986__tailssonic__little-fighter-jump.wav', 0.6);

// Load background music
audioManager.loadBGM('/sounds/MysticalForest1.wav', 0.3);

// Global state locks for level isolation
window.currentLevel = 'Base';

// Weather state
let snowWeather = null;

// Nuclear Container: all environment assets go into this single group
let levelContainer = new THREE.Group();
scene.add(levelContainer);

// Transition screen UI
let transitionElement = document.createElement('div');
transitionElement.className = 'level-transition';
transitionElement.innerHTML = `
  <h1 id="level-title">Snow Level Unlocked</h1>
  <p>Loading new level assets...</p>
`;
document.body.appendChild(transitionElement);

function showTransition(levelName) {
  let titleText = `${levelName} Level Unlocked!`;
  if (levelName === 'Snow') {
    titleText = 'WINTER LEVEL UNLOCKED';
  } else if (levelName === 'Forest') {
    titleText = 'FOREST LEVEL UNLOCKED';
  }
  document.getElementById('level-title').textContent = titleText;
  transitionElement.classList.add('active');
}

function hideTransition() {
  transitionElement.classList.remove('active');
}

// Character selection state
let currentCharIndex = 0;

// ============================================
// MAIN MENU — Tode Adventures Style
// ============================================

// Create the Main Menu Screen
const mainMenuScreen = document.createElement('div');
mainMenuScreen.className = 'main-menu-screen';
mainMenuScreen.innerHTML = `
  <div class="main-menu-content">
    <div class="menu-buttons-container">
      <div class="play-btn-wrapper">
        <button class="play-btn" id="main-play-btn">PLAY</button>
      </div>
    </div>
  </div>
`;
document.body.appendChild(mainMenuScreen);


// How to Play Modal
const howToPlayModal = document.createElement('div');
howToPlayModal.className = 'modal-overlay';
howToPlayModal.id = 'how-to-play-modal';
howToPlayModal.innerHTML = `
  <div class="modal-box">
    <h2 class="modal-title">How to Play</h2>
    <div class="modal-body rules-scroll">

      <div class="rule-card">
        <div class="rule-icon">🎮</div>
        <div class="rule-content">
          <div class="rule-title">Controls</div>
          <ul class="rule-list">
            <li><span class="key-badge">WASD</span> / <span class="key-badge">Arrows</span> — Move</li>
            <li><span class="key-badge">Space</span> — Attack enemies</li>
            <li><span class="key-badge">D-pad</span> — Rotate camera</li>
            <li><span class="key-badge">Esc</span> — Pause game</li>
          </ul>
        </div>
      </div>

      <div class="rule-card">
        <div class="rule-icon">🐸</div>
        <div class="rule-content">
          <div class="rule-title">Character Selection</div>
          <ul class="rule-list">
            <li>Use ◀ ▶ arrows to cycle through 3 characters</li>
            <li>Hover over the 3D model to enlarge it</li>
            <li>Click <span class="highlight">SELECT</span> to start the game</li>
          </ul>
        </div>
      </div>

      <div class="rule-card">
        <div class="rule-icon">🌍</div>
        <div class="rule-content">
          <div class="rule-title">Levels</div>
          <ul class="rule-list">
            <li><span class="level-dot base"></span> <strong>Base</strong> — Green world with houses & slimes</li>
            <li><span class="level-dot snow"></span> <strong>Snow</strong> (50 pts) — Snowy world with dragons</li>
            <li><span class="level-dot forest"></span> <strong>Forest</strong> (100 pts) — Dark forest with spiders</li>
          </ul>
        </div>
      </div>

      <div class="rule-card">
        <div class="rule-icon">❤️</div>
        <div class="rule-content">
          <div class="rule-title">Lives System</div>
          <ul class="rule-list">
            <li>You start with <span class="highlight">3 lives</span></li>
            <li>Enemy touch = lose 1 life + red flash</li>
            <li>0 lives = Game Over</li>
          </ul>
        </div>
      </div>

      <div class="rule-card">
        <div class="rule-icon">🪙</div>
        <div class="rule-content">
          <div class="rule-title">Collectibles</div>
          <ul class="rule-list">
            <li>🪙 <strong>Coins</strong> — +50 points each (max 4 on map)</li>
            <li>❤️ <strong>Heart</strong> — Restore 1 life (rare, far from start)</li>
            <li>🛡️ <strong>Shield</strong> — 10s invincibility, enemies die on contact</li>
          </ul>
        </div>
      </div>

      <div class="rule-card">
        <div class="rule-icon">⚡</div>
        <div class="rule-content">
          <div class="rule-title">Powers</div>
          <ul class="rule-list">
            <li><strong>Ultra Attack</strong> — Costs 100 pts, destroys all enemies</li>
            <li>Lightning button glows when you have enough points</li>
          </ul>
        </div>
      </div>

      <div class="rule-card">
        <div class="rule-icon">📊</div>
        <div class="rule-content">
          <div class="rule-title">Scoring</div>
          <ul class="rule-list">
            <li>Survival — Points increase over time</li>
            <li>Kills — Bonus points per enemy defeated</li>
            <li>Coins — +50 points each</li>
            <li>Shield kills — +20 points each</li>
          </ul>
        </div>
      </div>

      <div class="rule-card">
        <div class="rule-icon">💡</div>
        <div class="rule-content">
          <div class="rule-title">Pro Tips</div>
          <ul class="rule-list">
            <li>Explore far to find rare heart pickups</li>
            <li>Collect coins to reach levels faster</li>
            <li>Use Ultra Attack when surrounded</li>
            <li>Enemies get faster as score increases</li>
          </ul>
        </div>
      </div>

    </div>
    <button class="modal-close-btn" id="how-to-play-close-btn">Close</button>
  </div>
`;
document.body.appendChild(howToPlayModal);

// Unlock audio on any interaction with the main menu screen (browser autoplay policy)
mainMenuScreen.addEventListener('click', () => {
  audioManager.init();
}, { once: true });

// Main Menu — PLAY button: reveal character selection
document.getElementById('main-play-btn').addEventListener('click', () => {
  mainMenuScreen.style.opacity = '0';
  setTimeout(() => {
    mainMenuScreen.style.display = 'none';
  }, 500);
});


// How to Play Modal open/close
document.getElementById('how-to-play-close-btn').addEventListener('click', () => {
  howToPlayModal.classList.remove('active');
});
howToPlayModal.addEventListener('click', (e) => {
  if (e.target === howToPlayModal) {
    howToPlayModal.classList.remove('active');
  }
});

// Pause Modal
const pauseModal = document.createElement('div');
pauseModal.className = 'modal-overlay';
pauseModal.id = 'pause-modal';
pauseModal.innerHTML = `
  <div class="modal-box">
    <h2 class="modal-title" style="font-size: 36px; letter-spacing: 4px; color: #C5FF35;">PAUSED</h2>
    <button class="resume-btn" id="resume-btn">RESUME</button>
  </div>
`;
document.body.appendChild(pauseModal);

// Escape key closes modals
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    howToPlayModal.classList.remove('active');
    if (gameState === 'paused') {
      pauseModal.classList.remove('active');
      if (typeof clock !== 'undefined') clock.getDelta();
      gameState = 'playing';
    }
  }
});

// Create Start Screen UI with character selection
const startScreen = document.createElement('div');
startScreen.className = 'start-screen';
startScreen.innerHTML = `
  <h1 class="game-title">SELECT YOUR CHARACTER</h1>
  <div class="char-select-container">
    <button class="char-arrow" id="prev-char">◀</button>
    <div class="char-name" id="char-name-display">${CHARACTERS[0].name}</div>
    <button class="char-arrow" id="next-char">▶</button>
  </div>
  <button class="start-btn" id="start-btn">SELECT</button>
`;
document.body.appendChild(startScreen);

// Previous character button
document.getElementById('prev-char').addEventListener('click', () => {
  currentCharIndex = (currentCharIndex - 1 + CHARACTERS.length) % CHARACTERS.length;
  document.getElementById('char-name-display').textContent = CHARACTERS[currentCharIndex].name;
  player._startScreenInitialized = false;
  player.loadModel(currentCharIndex);
});

// Next character button
document.getElementById('next-char').addEventListener('click', () => {
  currentCharIndex = (currentCharIndex + 1) % CHARACTERS.length;
  document.getElementById('char-name-display').textContent = CHARACTERS[currentCharIndex].name;
  player._startScreenInitialized = false;
  player.loadModel(currentCharIndex);
});

// Start Game on Click (audio already unlocked by Intro screen)
document.getElementById('start-btn').addEventListener('click', () => {
  // Hide the start screen
  startScreen.style.display = 'none';

  // Reset scale and rotation for gameplay
  player.targetScaleMultiplier = 1.0;
  if (player.model) {
    player.model.scale.setScalar(player.baseScale);
    player.model.rotation.y = 0; // Snap rotation forward
  }

  // Generate the world
  resetGame();

  // OVERRIDE state to freeze gameplay while the camera swoops in
  gameState = 'cinematic_intro';
  introProgress = 0;

  // Hide the score UI and D-pad temporarily during the cinematic
  hideScore();
  hideDpad();
});

// Setup weather for a specific level
function setupWeather(level) {
  // Always wipe old weather first
  if (typeof snowWeather !== 'undefined' && snowWeather) {
    if (snowWeather.parent) snowWeather.parent.remove(snowWeather);
    if (snowWeather.geometry) snowWeather.geometry.dispose();
    if (snowWeather.material) snowWeather.material.dispose();
    snowWeather = null;
  }

  if (level === 'Snow') {
    const particleCount = 1500;
    const snowGeo = new THREE.SphereGeometry(2.5, 4, 4);
    const snowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    snowWeather = new THREE.InstancedMesh(snowGeo, snowMat, particleCount);

    snowWeather.userData.positions = [];
    const velocities = [];
    const dummy = new THREE.Object3D();

    for (let i = 0; i < particleCount; i++) {
      const x = player.position.x + (Math.random() - 0.5) * 2000;
      const y = player.position.y + (Math.random() - 0.5) * 2000;
      const z = Math.random() * 600;
      snowWeather.userData.positions.push({ x, y, z });

      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      snowWeather.setMatrixAt(i, dummy.matrix);

      velocities.push({
        x: 0,
        y: 0,
        z: -(Math.random() * 120 + 80),
      });
    }
    snowWeather.userData.velocities = velocities;
    levelContainer.add(snowWeather);
  }
}

// Trigger level-up — Nuclear Container Pattern: destroy entire container and rebuild
function triggerLevelUp(nextLevel) {
  // 1. Freeze the game and set level BEFORE the wipe
  gameState = 'transitioning';
  window.currentLevel = nextLevel;

  // Change sky color based on level
  if (nextLevel === 'Snow') {
    scene.background = new THREE.Color(0x87CEEB); // Bright sky blue
  } else {
    scene.background = new THREE.Color(0x87CEEB); // Default sky
  }

  // 2. Show the loading screen
  showTransition(nextLevel);

  // 3. NUCLEAR WIPE: Erase the entire physical space of the old level
  scene.remove(levelContainer);

  // 4. Create a completely fresh, empty container
  levelContainer = new THREE.Group();
  scene.add(levelContainer);

  // 5. Nuke the tracking arrays entirely
  dynamicHouses = [];
  if (typeof housesByGrid !== 'undefined') housesByGrid.clear();

  // 6. Nuke and Rebuild the Map Manager from scratch
  if (typeof mapManager !== 'undefined' && mapManager.map) {
    scene.remove(mapManager.map);
  }
  mapManager = createMap(
    // onHouseSpawn callback
    (worldX, worldY, gridX, gridY) => {
      // Prevent house overlapping — skip if another house is within 400 units
      let tooClose = false;
      for (let i = 0; i < dynamicHouses.length; i++) {
        const house = dynamicHouses[i];
        if (house && Math.hypot(house.x - worldX, house.y - worldY) < 400) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) return;

      const house = createSingleHouse(worldX, worldY, window.currentLevel);
      levelContainer.add(house.group);
      const idx = dynamicHouses.push(house) - 1;
      housesByGrid.set(`${gridX},${gridY}`, idx);
    },
    // onHouseDespawn callback
    (gridX, gridY) => {
      const key = `${gridX},${gridY}`;
      const idx = housesByGrid.get(key);
      if (idx !== undefined && idx < dynamicHouses.length) {
        const house = dynamicHouses[idx];
        if (house) {
          levelContainer.remove(house.group);
          // Dispose meshes inside the house group
          house.group.traverse((child) => {
            if (child.isMesh) {
              if (child.geometry) child.geometry.dispose();
              if (child.material) child.material.dispose();
            }
          });
          dynamicHouses[idx] = null; // mark as removed
        }
        housesByGrid.delete(key);
      }
    }
  );
  levelContainer.add(mapManager.map);

  // STRICT RULE: Force ground color to match the new level instantly
  mapManager.setBiome(nextLevel);

  // 7. Setup new Weather inside the container
  setupWeather(nextLevel);

  // 7. Clear coins and reattach to new container
  coinManager.clear();
  coinManager.setContainer(levelContainer);

  // 7.5. Clear heart pickups and reattach to new container
  heartPickupManager.clear();
  heartPickupManager.setContainer(levelContainer);

  // 7.6. Clear shield pickups and reattach to new container
  shieldPickupManager.clear();
  shieldPickupManager.setContainer(levelContainer);

  // 8. Clear old enemies and set level
  enemyManager.setBiome(nextLevel);
  enemyManager.clear();

  // 9. Wait 2.5 seconds for new GLB models to pre-fetch, then unfreeze
  setTimeout(() => {
    hideTransition();
    enemyManager.spawnAll(player.position);
    gameState = 'playing';
    showDpad();
    showScore();
  }, 2500);
}

// Dynamic houses array for procedural world
let dynamicHouses = [];
let housesByGrid = new Map(); // gridX,gridY -> house index in dynamicHouses

// Map floor — procedural infinite map manager
let mapManager = createMap(
  // onHouseSpawn callback
  (worldX, worldY, gridX, gridY) => {
    // Prevent house overlapping — skip if another house is within 400 units
    let tooClose = false;
    for (let i = 0; i < dynamicHouses.length; i++) {
      const house = dynamicHouses[i];
      if (house && Math.hypot(house.x - worldX, house.y - worldY) < 400) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) return;

    const house = createSingleHouse(worldX, worldY, window.currentLevel);
    levelContainer.add(house.group);
    const idx = dynamicHouses.push(house) - 1;
    housesByGrid.set(`${gridX},${gridY}`, idx);
  },
  // onHouseDespawn callback
  (gridX, gridY) => {
    const key = `${gridX},${gridY}`;
    const idx = housesByGrid.get(key);
    if (idx !== undefined && idx < dynamicHouses.length) {
      const house = dynamicHouses[idx];
      if (house) {
        levelContainer.remove(house.group);
        // Dispose meshes inside the house group
        house.group.traverse((child) => {
          if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
          }
        });
        dynamicHouses[idx] = null; // mark as removed
      }
      housesByGrid.delete(key);
    }
  }
);
levelContainer.add(mapManager.map);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(-100, -100, 200);
directionalLight.castShadow = true;
directionalLight.shadow.bias = -0.0005; // Eliminates striped shadow acne
scene.add(directionalLight);

// Enemies
const enemyManager = createEnemyManager(scene);

// Coins
const coinManager = createCoinManager();
coinManager.setContainer(levelContainer);

// Heart Pickups
const heartPickupManager = createHeartPickupManager();
heartPickupManager.setContainer(levelContainer);

// Shield Pickups
const shieldPickupManager = createShieldPickupManager();
shieldPickupManager.setContainer(levelContainer);

// Player
const player = createPlayer(scene);
scene.add(player);

// Game State: 'start_screen' | 'cinematic_intro' | 'playing' | 'game_over' | 'transitioning'
let gameState = 'start_screen';

// Cinematic intro camera swoop progress
let introProgress = 0;

// Continuous enemy spawning accumulated timer
let spawnTimer = 0;

window.__game = {
  get player() { return player; },
  get enemyManager() { return enemyManager; },
  getScore: () => score,
  setScore: (s) => { score = s; updateScoreUI(); },
  getGameState: () => gameState,
  triggerGameOver: () => triggerGameOver(),
  resetGame: () => resetGame(),
  getDifficulty: () => calculateDifficulty(score),
};

// ============================================
// HUD — Score and Lives (Top-Left)
// ============================================
let score = 0;
let lives = 3;

// SVG Heart icon (gradient-filled, premium look)
const heartSVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="heartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#ff6b8a"/>
      <stop offset="100%" style="stop-color:#e60033"/>
    </linearGradient>
  </defs>
  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 
           C2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
           C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5
           c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="url(#heartGrad)"/>
</svg>`;

const heartSVGLost = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 
           C2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
           C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5
           c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#555"/>
</svg>`;

// Create HUD container
const hudContainer = document.createElement('div');
hudContainer.className = 'hud-container';
hudContainer.innerHTML = `
  <div class="hud-pill lives-pill">
    <svg viewBox="0 0 24 24" class="hud-icon"><path fill="#ff4d4d" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
    <span class="lives-text" id="lives-display">3</span>
  </div>

  <div class="hud-pill score-pill">
    <span class="score-label">SCORE</span>
    <span class="score-text" id="score-display">0</span>
  </div>

  <!-- ULTRA ATTACK BUTTON -->
  <button class="ultra-btn" id="ultra-btn" title="Screen Clear (100 PTS)">
    <div class="ultra-energy-core"></div>
    <svg class="ultra-icon" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
    <span class="ultra-cost">100</span>
  </button>

  <!-- SHIELD TIMER -->
  <div class="hud-pill shield-pill" id="shield-display" style="display: none;">
    <svg viewBox="0 0 24 24" class="hud-icon"><path fill="#c044ff" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
    <span id="shield-time">10</span>s
  </div>

  <!-- PAUSE BUTTON -->
  <button class="pause-btn" id="pause-btn" title="Pause Game">
    <svg viewBox="0 0 24 24">
      <path d="M6 4h4v16H6zm8 0h4v16h-4z"/>
    </svg>
    <span>PAUSE</span>
  </button>
`;
hudContainer.style.display = 'none';
document.body.appendChild(hudContainer);

function updateHUD() {
  const scoreDisplay = document.getElementById('score-display');
  if (scoreDisplay) scoreDisplay.textContent = Math.floor(score).toString();

  // Lives display: show the number of lives
  const livesDisplay = document.getElementById('lives-display');
  if (livesDisplay) livesDisplay.textContent = Math.max(0, lives).toString();

  // Ultra Attack button glow when score >= 100
  const ultraBtn = document.getElementById('ultra-btn');
  if (ultraBtn) {
    if (score >= 100) {
      ultraBtn.classList.add('ready');
    } else {
      ultraBtn.classList.remove('ready');
    }
  }
}

function showScore() {
  hudContainer.style.display = 'flex';
}
function hideScore() {
  hudContainer.style.display = 'none';
}

// ============================================
// MUSIC TOGGLE BUTTON — Top Right Corner
// ============================================

const svgMusicOn = `
  <svg viewBox="0 0 24 24">
    <path d="M9 18V5l12-2v13"></path>
    <circle cx="6" cy="18" r="3"></circle>
    <circle cx="18" cy="16" r="3"></circle>
  </svg>
`;

const svgMusicOff = `
  <svg viewBox="0 0 24 24">
    <line x1="2" y1="2" x2="22" y2="22" class="strike-line"></line>
    <path d="M9 18V5l12-2v13" opacity="0.4"></path>
    <circle cx="6" cy="18" r="3" opacity="0.4"></circle>
    <circle cx="18" cy="16" r="3" opacity="0.4"></circle>
  </svg>
`;

// ============================================
// HOW TO PLAY BUTTON — Top Right (before music icon)
// ============================================

const howToPlayTopBtn = document.createElement('button');
howToPlayTopBtn.className = 'top-right-btn';
howToPlayTopBtn.id = 'how-to-play-top-btn';
howToPlayTopBtn.title = 'How to Play';
howToPlayTopBtn.innerHTML = `
  <svg viewBox="0 0 24 24">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
    <line x1="8" y1="7" x2="16" y2="7"></line>
    <line x1="8" y1="11" x2="14" y2="11"></line>
  </svg>
`;
document.body.appendChild(howToPlayTopBtn);

// How to Play Modal open (top-right button)
howToPlayTopBtn.addEventListener('click', () => {
  howToPlayModal.classList.add('active');
});

// ============================================
// MUSIC TOGGLE BUTTON — Top Right Corner
// ============================================

const musicBtn = document.createElement('button');
musicBtn.className = 'music-toggle-btn';
musicBtn.id = 'music-toggle-btn';
musicBtn.innerHTML = svgMusicOn;
document.body.appendChild(musicBtn);

// Toggle click logic
musicBtn.addEventListener('click', () => {
  const isMuted = audioManager.toggleMute();

  if (isMuted) {
    musicBtn.innerHTML = svgMusicOff;
    musicBtn.classList.add('muted');
  } else {
    musicBtn.innerHTML = svgMusicOn;
    musicBtn.classList.remove('muted');
  }
});

// ============================================
// ULTRA ATTACK, PAUSE, RESUME — Bulletproof event delegation
// ============================================

document.addEventListener('click', (event) => {

  // --- ULTRA BUTTON LOGIC ---
  const ultraBtn = event.target.closest('#ultra-btn');
  if (ultraBtn && gameState === 'playing') {
    if (score >= 100) {
      score -= 100;
      if (player.fireUltraBlast) player.fireUltraBlast();
      audioManager.play('jump');

      for (let i = enemyManager.enemies.length - 1; i >= 0; i--) {
        const e = enemyManager.enemies[i];
        e.group.userData.isDespawned = true;
        if (e.group.parent) e.group.parent.remove(e.group);
      }
      enemyManager.enemies.length = 0;
      updateHUD();
    }
    return;
  }

  // --- PAUSE LOGIC ---
  const pauseBtn = event.target.closest('#pause-btn');
  if (pauseBtn && gameState === 'playing') {
    gameState = 'paused';
    pauseModal.classList.add('active');
    return;
  }

  // --- RESUME LOGIC ---
  const resumeBtn = event.target.closest('#resume-btn');
  if (resumeBtn && gameState === 'paused') {
    pauseModal.classList.remove('active');
    // CRITICAL FIX: Flush the clock so enemies don't teleport after unpausing!
    if (typeof clock !== 'undefined') clock.getDelta();
    gameState = 'playing';
    return;
  }
});

// Game Over UI
let gameOverElement = null;

function showGameOverOverlay() {
  if (!gameOverElement) {
    gameOverElement = document.createElement('div');
    gameOverElement.className = 'game-over';
    gameOverElement.innerHTML = `
      <div class="game-over-box">
        <div class="game-over-title">Game Over</div>
        <p class="game-over-score-label">Final Score</p>
        <p class="game-over-score-value" id="game-over-final-score">${Math.floor(score)}</p>
        <button class="game-over-restart-btn" id="game-over-restart-btn">Play Again</button>
        <p class="game-over-hint">or press Space to restart</p>
      </div>
    `;
    document.body.appendChild(gameOverElement);

    // Wire the restart button
    const restartBtn = document.getElementById('game-over-restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        resetGame();
        gameState = 'playing';
        showDpad();
        showScore();
      });
    }
  }
}

function removeGameOverOverlay() {
  if (gameOverElement) {
    gameOverElement.remove();
    gameOverElement = null;
  }
}

function handlePlayerHit() {
  if (player.isShielded && player.isShielded()) return; // DO NOT TAKE DAMAGE
  if (gameState !== 'playing') return;

  lives--;
  updateHUD();

  // Flash screen red
  const flash = document.createElement('div');
  flash.className = 'damage-flash';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 400);

  if (lives > 0) {
    // Soft respawn — keep score, clear nearby enemies
    gameState = 'respawning';

    // Clear enemies away from player so they don't instakill again
    enemyManager.clear();

    // Reset player visually
    player.position.set(0, 0, 0);
    if (player.model) player.model.rotation.y = 0;

    // Resume game after 1 second
    setTimeout(() => {
      enemyManager.spawnAll(player.position);
      gameState = 'playing';
    }, 1000);
  } else {
    // Completely out of lives — Game Over
    triggerGameOver();
  }
}

function triggerGameOver() {
  if (gameState === 'game_over') return;
  gameState = 'game_over';
  hideDpad();
  hideScore();

  // 1. Display Game Over overlay (div.game-over)
  showGameOverOverlay();

  // 2. Player character should be removed or made invisible
  player.setVisible(false);

  // 3. Enemies should stop moving
  enemyManager.isMoving = false;

  // 4. Disable further player actions
  player.enabled = false;
}

function resetGame() {
  // 1. Remove Game Over overlay
  removeGameOverOverlay();

  // 2. Reset player position to start and re-enable
  player.reset();

  // 3. Reset score, lives, and level state completely
  score = 0;
  lives = 3;
  updateHUD();
  window.currentLevel = 'Base';

  // Reset sky color to default
  scene.background = new THREE.Color(0xd6eaf8);

  // 4. NUCLEAR WIPE: Erase the entire level container
  scene.remove(levelContainer);
  levelContainer = new THREE.Group();
  scene.add(levelContainer);

  // 5. Nuke the tracking arrays entirely
  dynamicHouses = [];
  if (typeof housesByGrid !== 'undefined') housesByGrid.clear();

  // 6. Nuke and Rebuild the Map Manager from scratch
  if (typeof mapManager !== 'undefined' && mapManager.map) {
    scene.remove(mapManager.map);
  }
  mapManager = createMap(
    // onHouseSpawn callback
    (worldX, worldY, gridX, gridY) => {
      // Prevent house overlapping — skip if another house is within 400 units
      let tooClose = false;
      for (let i = 0; i < dynamicHouses.length; i++) {
        const house = dynamicHouses[i];
        if (house && Math.hypot(house.x - worldX, house.y - worldY) < 400) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) return;

      const house = createSingleHouse(worldX, worldY, window.currentLevel);
      levelContainer.add(house.group);
      const idx = dynamicHouses.push(house) - 1;
      housesByGrid.set(`${gridX},${gridY}`, idx);
    },
    // onHouseDespawn callback
    (gridX, gridY) => {
      const key = `${gridX},${gridY}`;
      const idx = housesByGrid.get(key);
      if (idx !== undefined && idx < dynamicHouses.length) {
        const house = dynamicHouses[idx];
        if (house) {
          levelContainer.remove(house.group);
          // Dispose meshes inside the house group
          house.group.traverse((child) => {
            if (child.isMesh) {
              if (child.geometry) child.geometry.dispose();
              if (child.material) child.material.dispose();
            }
          });
          dynamicHouses[idx] = null; // mark as removed
        }
        housesByGrid.delete(key);
      }
    }
  );
  levelContainer.add(mapManager.map);

  // 7. Set level to Base
  mapManager.setBiome('Base');

  // 7. Clear coins and reattach to new container
  coinManager.clear();
  coinManager.setContainer(levelContainer);

  // 7.5. Clear heart pickups and reattach to new container
  heartPickupManager.clear();
  heartPickupManager.setContainer(levelContainer);

  // 7.6. Clear shield pickups and reattach to new container
  shieldPickupManager.clear();
  shieldPickupManager.setContainer(levelContainer);

  // 8. Clear existing enemies and re-spawn around player
  enemyManager.setBiome('Base');
  enemyManager.clear();
  enemyManager.spawnAll(player.position);
  enemyManager.isMoving = true;

  // 9. Reset spawn timer and update UI
  spawnTimer = 0;
  updateHUD();

  // Flush clock delta before resuming loop
  clock.getDelta();

  // 10. Resume game state
  gameState = 'playing';
  showDpad();
  showScore();
}

// Space key triggers reset in Game Over state
window.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && gameState === 'game_over') {
    event.preventDefault();
    resetGame();
  }
});


// Collision validation for player: cannot walk through enemies or houses
player.canMove = (targetX, targetY) => {
  if (gameState !== 'playing') return false;

  // Check enemy collisions - handling Game Over has higher priority
  for (let i = 0; i < enemyManager.enemies.length; i++) {
    const e = enemyManager.enemies[i];
    if (!e || !e.group) continue;
    const dist = Math.hypot(e.group.position.x - targetX, e.group.position.y - targetY);
    if (dist <= MIN_COLLISION_DISTANCE) {
      handlePlayerHit();
      return false;
    }
  }

  // Check dynamic house obstacle collisions
  for (let j = 0; j < dynamicHouses.length; j++) {
    const h = dynamicHouses[j];
    if (!h) continue; // Skip despawned houses
    const distHouse = Math.hypot(h.x - targetX, h.y - targetY);
    if (distHouse < (h.radius || HOUSE_COLLISION_RADIUS)) {
      return false; // Blocked by house wall
    }
  }

  return true;
};

// Attack interaction
player.onAttack = (attackPosition, radius) => {
  if (gameState !== 'playing') return;
  const killedCount = enemyManager.handleAttack(attackPosition, radius);
  if (killedCount > 0) {
    score += killedCount * SCORE_PER_KILL;
    updateHUD();
  }
};

// Key listener to toggle enemy movement (M key)
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM' && gameState === 'playing') {
    enemyManager.toggleMovement();
  }
});

// Camera — orbital system (not attached to player)
const camera = createCamera();
scene.add(camera);

// Orbital camera state variables
let cameraAngle = -Math.PI / 4; // Horizontal angle (isometric view)
let cameraRadius = 424.26;     // Distance on XY plane (sqrt(300^2 + 300^2))
let cameraHeight = 300;         // Z-axis height

function updateCameraPosition() {
  camera.position.x = player.position.x + Math.cos(cameraAngle) * cameraRadius;
  camera.position.y = player.position.y + Math.sin(cameraAngle) * cameraRadius;
  camera.position.z = cameraHeight;
  camera.lookAt(player.position.x, player.position.y, 0);
}

// D-pad button interactions — held-button continuous camera control
const dpadElement = document.getElementById('dpad');
const dpadUp = document.getElementById('dpad-up');
const dpadDown = document.getElementById('dpad-down');
const dpadLeft = document.getElementById('dpad-left');
const dpadRight = document.getElementById('dpad-right');

function showDpad() {
  if (dpadElement) {
    dpadElement.style.display = 'block';
    dpadElement.classList.add('visible');
  }
}
function hideDpad() {
  if (dpadElement) {
    dpadElement.style.display = 'none';
    dpadElement.classList.remove('visible');
  }
}

let camLeft = false;
let camRight = false;
let camUp = false;
let camDown = false;

function stopCameraMovement() {
  camLeft = false;
  camRight = false;
  camUp = false;
  camDown = false;
}

// Global interruption listeners — stop camera on ANY pointer release, cancel, blur, or right-click
window.addEventListener('pointerup', stopCameraMovement);
window.addEventListener('pointercancel', stopCameraMovement);
window.addEventListener('blur', stopCameraMovement);
window.addEventListener('contextmenu', stopCameraMovement);

// Clean button listeners — pointerdown only for initial press
dpadUp.addEventListener('pointerdown', (e) => { e.preventDefault(); camUp = true; });
dpadDown.addEventListener('pointerdown', (e) => { e.preventDefault(); camDown = true; });
dpadLeft.addEventListener('pointerdown', (e) => { e.preventDefault(); camLeft = true; });
dpadRight.addEventListener('pointerdown', (e) => { e.preventDefault(); camRight = true; });

// Initial camera position
updateCameraPosition();

// Renderer
const renderer = createRenderer();

// Animation loop
const clock = new THREE.Clock();

function checkCollisions() {
  if (gameState !== 'playing') return;
  for (let i = 0; i < enemyManager.enemies.length; i++) {
    const e = enemyManager.enemies[i];
    const dist = Math.hypot(e.group.position.x - player.position.x, e.group.position.y - player.position.y);
    if (dist <= MIN_COLLISION_DISTANCE) {
      handlePlayerHit();
      return;
    }
  }
}

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.1);

  // Update procedural map every frame (pause during transitions and start screen)
  if (gameState !== 'transitioning' && gameState !== 'start_screen') {
    mapManager.update(player.position);
  }

  if (gameState === 'start_screen') {
    // 1. Raycast to see if mouse is touching the player model
    raycaster.setFromCamera(mouse, camera);
    if (player.model) {
      const intersects = raycaster.intersectObject(player.model, true);
      isModelHovered = intersects.length > 0;

      // 2. Set target scale (1.25x larger if hovered)
      player.targetScaleMultiplier = isModelHovered ? 1.25 : 1.0;

      // 3. Smoothly lerp the actual scale for AAA feel
      const currentScale = player.model.scale.x;
      const targetScale = player.baseScale * player.targetScaleMultiplier;
      const newScale = THREE.MathUtils.lerp(currentScale, targetScale, 10 * delta);
      player.model.scale.setScalar(newScale);

      // 4. Slowly spin the character
      player.model.rotation.y += delta * 0.8;
    }

    // 5. Cinematic Showcase Camera — front view of the character
    // In Z-up coordinate system, camera on the Y axis sees the front/side of the character.
    // Positioned slightly elevated (z=40) for a nice three-quarter front view.
    camera.position.set(0, -150, 40);
    // Look directly at the center of the screen so the frog is centered
    camera.lookAt(0, 0, 0);

    // Reset model rotation so the front faces the camera
    if (player.model && !player._startScreenInitialized) {
      player.model.rotation.y = 0;
      player._startScreenInitialized = true;
    }

  } else if (gameState === 'cinematic_intro') {
    // 1. Advance the timer (completes in ~2.5 seconds)
    introProgress += delta * 0.4;

    // 2. Smooth ease-out math (fast at start, slow/smooth landing)
    const ease = 1 - Math.pow(1 - Math.min(introProgress, 1), 4);

    // 3. Lerp Camera Position (From high sky to gameplay view)
    // Starts at a different angle (Math.PI / 2) to create a spinning sweep effect
    cameraAngle = THREE.MathUtils.lerp(Math.PI / 2, -Math.PI / 4, ease);
    cameraRadius = THREE.MathUtils.lerp(1800, 424.26, ease);
    cameraHeight = THREE.MathUtils.lerp(2000, 300, ease);

    camera.position.x = player.position.x + Math.cos(cameraAngle) * cameraRadius;
    camera.position.y = player.position.y + Math.sin(cameraAngle) * cameraRadius;
    camera.position.z = cameraHeight;
    camera.lookAt(player.position.x, player.position.y, 0);

    // 4. End Cinematic and begin normal game
    if (introProgress >= 1.0) {
      gameState = 'playing';
      showDpad();
      showScore();
    }

  } else if (gameState === 'playing') {
    // Ensure player model scale matches the selected character's base scale
    if (player.model) {
      player.model.scale.setScalar(player.baseScale);
    }

    // 1. Recalculate difficulty parameters in each frame of the animation loop using the current score
    const difficulty = calculateDifficulty(score);

    // 2. Apply updated speeds and delays to the respective game systems
    enemyManager.speed = difficulty.enemySpeed;
    player.moveSpeed = difficulty.playerSpeed;
    player.attackCooldown = difficulty.attackCooldown;
    player.attackRadius = difficulty.attackRadius;

    // 3. Enemy continuous spawning with accumulated timer
    spawnTimer += delta;
    if (spawnTimer >= difficulty.spawnDelay) {
      spawnTimer = 0;
      enemyManager.spawnNext(player.position);
    }

    player.update(delta);
    const activeHouses = dynamicHouses.filter(h => h !== null);
    enemyManager.update(delta, player.position, activeHouses, handlePlayerHit);
    checkCollisions();

    // Update coin physics and spawning
    coinManager.update(delta, player.position);

    // Check for Coin Pickups
    for (let i = coinManager.coins.length - 1; i >= 0; i--) {
      const coin = coinManager.coins[i];
      const dist = Math.hypot(coin.position.x - player.position.x, coin.position.y - player.position.y);

      // If Tode touches the coin (40 units radius)
      if (dist < 40) {
        coinManager.removeCoin(i);
        score += 50;
        updateHUD();
        audioManager.play('jump');
      }
    }

    // Update Heart Pickups
    heartPickupManager.update(delta, player.position);

    // Check for Heart Pickups
    for (let i = heartPickupManager.hearts.length - 1; i >= 0; i--) {
      const heart = heartPickupManager.hearts[i];
      const dist = Math.hypot(heart.position.x - player.position.x, heart.position.y - player.position.y);

      // If Tode touches the heart (40 units radius)
      if (dist < 40) {
        heartPickupManager.removeHeart(i);

        // Add a life if under 3, otherwise give a 100 point bonus!
        if (lives < 3) {
          lives++;
        } else {
          score += 100; // Bonus for picking up heart at max health
        }

        updateHUD();
        audioManager.play('jump');
      }
    }

    // Update Shield Manager
    shieldPickupManager.update(delta, player.position);

    // Check for Shield Pickups
    for (let i = shieldPickupManager.shields.length - 1; i >= 0; i--) {
      const shield = shieldPickupManager.shields[i];
      if (Math.hypot(shield.position.x - player.position.x, shield.position.y - player.position.y) < 40) {
        shieldPickupManager.removeShield(i);
        player.activateShield(); // Gives 10 seconds of invincibility
      }
    }

    // Live UI Update & Forcefield Kill Logic
    const shieldDisplay = document.getElementById('shield-display');
    if (player.isShielded && player.isShielded()) {
      if (shieldDisplay.style.display !== 'flex') {
        shieldDisplay.style.display = 'flex';
        shieldDisplay.classList.add('shield-active');
      }
      document.getElementById('shield-time').textContent = Math.ceil(player.shieldTimer);

      // Instantly kill enemies that touch the glowing forcefield!
      for (let i = enemyManager.enemies.length - 1; i >= 0; i--) {
        const e = enemyManager.enemies[i];
        if (!e || !e.group) continue;
        if (Math.hypot(e.group.position.x - player.position.x, e.group.position.y - player.position.y) < 75) {
          e.group.userData.isDespawned = true;
          if (e.group.parent) e.group.parent.remove(e.group); // FIXED: remove from parent container
          enemyManager.enemies.splice(i, 1);
          score += 20; // Bonus points for shield kills
          updateHUD();
        }
      }
    } else if (shieldDisplay && shieldDisplay.style.display !== 'none') {
      shieldDisplay.style.display = 'none';
      shieldDisplay.classList.remove('shield-active');
    }

    // Survival score: 0.1 points per second (1 pt per 10s)
    score += delta * SCORE_PER_SECOND;
    updateHUD();

    // Level transition triggers (top-down order to prevent skipping)
    if (score >= 100 && window.currentLevel !== 'Forest') {
      triggerLevelUp('Forest');
    } else if (score >= 50 && score < 100 && window.currentLevel === 'Base') {
      triggerLevelUp('Snow');
    }

    // Continuous camera adjustment based on held D-pad buttons
    if (camLeft) cameraAngle -= 2.0 * delta;
    if (camRight) cameraAngle += 2.0 * delta;
    if (camUp) cameraHeight = Math.min(600, cameraHeight + 300 * delta);
    if (camDown) cameraHeight = Math.max(100, cameraHeight - 300 * delta);

    // Update camera to follow player every frame
    camera.position.x = player.position.x + Math.cos(cameraAngle) * cameraRadius;
    camera.position.y = player.position.y + Math.sin(cameraAngle) * cameraRadius;
    camera.position.z = cameraHeight;
    camera.lookAt(player.position.x, player.position.y, 0);
  }

  // Snow weather physics (InstancedMesh) — only animate in Snow level
  if (typeof snowWeather !== 'undefined' && snowWeather && snowWeather.isInstancedMesh && window.currentLevel === 'Snow') {
    const dummy = new THREE.Object3D();
    const positions = snowWeather.userData.positions;
    const velocities = snowWeather.userData.velocities;

    for (let i = 0; i < positions.length; i++) {
      positions[i].x += velocities[i].x * delta;
      positions[i].y += velocities[i].y * delta;
      positions[i].z += velocities[i].z * delta;

      if (positions[i].z < 0) {
        positions[i].x = player.position.x + (Math.random() - 0.5) * 2000;
        positions[i].y = player.position.y + (Math.random() - 0.5) * 2000;
        positions[i].z = 600 + Math.random() * 200;
      }

      dummy.position.set(positions[i].x, positions[i].y, positions[i].z);
      dummy.updateMatrix();
      snowWeather.setMatrixAt(i, dummy.matrix);
    }
    snowWeather.instanceMatrix.needsUpdate = true;
  }

  renderer.render(scene, camera);
});

// Window resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

