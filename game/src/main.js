import './style.css';
import * as THREE from 'three';
import { createCamera } from './components/camera.js';
import { createRenderer } from './components/renderer.js';
import { createPlayer } from './components/player.js';
import { createEnemyManager } from './components/Enemy.js';
import { createMap } from './components/Map.js';
import { createHouses } from './components/House.js';
import {
  MIN_COLLISION_DISTANCE,
  HOUSE_COLLISION_RADIUS,
  SCORE_PER_SECOND,
  SCORE_PER_KILL,
  calculateDifficulty,
} from './components/constants.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd6eaf8);

// Map floor
const map = createMap();
scene.add(map);

// Houses (added as children to map group per spec)
const houses = createHouses();
houses.forEach((house) => {
  map.add(house.group);
});

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(-100, -100, 200);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Enemies
const enemyManager = createEnemyManager(scene);

// Player
const player = createPlayer(scene);
scene.add(player);

// Game State: 'playing' | 'game_over'
let gameState = 'playing';

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

// Score UI
let score = 0;
let scoreElement = document.querySelector('.score');
if (!scoreElement) {
  scoreElement = document.createElement('div');
  scoreElement.className = 'score';
  scoreElement.textContent = '0';
  document.body.appendChild(scoreElement);
}

function updateScoreUI() {
  if (scoreElement) {
    scoreElement.textContent = Math.floor(score).toString();
  }
}

// Game Over UI
let gameOverElement = null;

function showGameOverOverlay() {
  if (!gameOverElement) {
    gameOverElement = document.createElement('div');
    gameOverElement.className = 'game-over';
    gameOverElement.innerHTML = `
      <h1>Game Over</h1>
      <p>Press Space to restart</p>
    `;
    document.body.appendChild(gameOverElement);
  }
}

function removeGameOverOverlay() {
  if (gameOverElement) {
    gameOverElement.remove();
    gameOverElement = null;
  }
}

function triggerGameOver() {
  if (gameState === 'game_over') return;
  gameState = 'game_over';

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

  // 3. Clear existing enemies and re-spawn at map corners
  enemyManager.clear();
  enemyManager.spawnAll();
  enemyManager.isMoving = true;

  // 4. Reset spawn timer, score, and update UI
  spawnTimer = 0;
  score = 0;
  updateScoreUI();

  // Flush clock delta before resuming loop
  clock.getDelta();

  // 5. Resume game state
  gameState = 'playing';
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
    const dist = Math.hypot(e.group.position.x - targetX, e.group.position.y - targetY);
    if (dist <= MIN_COLLISION_DISTANCE) {
      triggerGameOver();
      return false;
    }
  }

  // Check house obstacle collisions
  for (let j = 0; j < houses.length; j++) {
    const h = houses[j];
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
    updateScoreUI();
  }
};

// Key listener to toggle enemy movement (M key)
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyM' && gameState === 'playing') {
    enemyManager.toggleMovement();
  }
});

// Camera
const camera = createCamera();
player.add(camera);

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
      triggerGameOver();
      return;
    }
  }
}

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.1);

  if (gameState === 'playing') {
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
      enemyManager.spawnNext();
    }

    player.update(delta);
    enemyManager.update(delta, player.position, houses, triggerGameOver);
    checkCollisions();

    // Survival score: 0.1 points per second (1 pt per 10s)
    score += delta * SCORE_PER_SECOND;
    updateScoreUI();
  }

  renderer.render(scene, camera);
});

// Window resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
