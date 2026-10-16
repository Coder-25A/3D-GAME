export const MIN_COLLISION_DISTANCE = 35; // Minimum distance between entities
export const HOUSE_COLLISION_RADIUS = 50; // Minimum distance from house center (house dimensions ~58x54)

export const PLAYER_RADIUS = 16;
export const ENEMY_RADIUS = 16;

export const JUMP_HEIGHT = 45;
export const JUMP_DISTANCE = 80;
export const MOVE_SPEED = 240;

export const ATTACK_COOLDOWN = 1.0;
export const ATTACK_RADIUS = 120;

export const DEFAULT_ENEMY_SPEED = 50;

export const SCORE_PER_SECOND = 0.1;
export const SCORE_PER_KILL = 10;

// Dynamic difficulty scaling constants
export const COMPLEXITY_GROWTH_RATE = 0.01;

export const BASE_SPAWN_DELAY = 4.0;
export const MIN_SPAWN_DELAY = 0.8;

export const BASE_ENEMY_SPEED = 50;
export const BASE_PLAYER_SPEED = 240;

export const BASE_ATTACK_COOLDOWN = 1.0;
export const MIN_ATTACK_COOLDOWN = 0.35;

export const BASE_ATTACK_RADIUS = 120;
export const MAX_ATTACK_RADIUS = 200;

export function calculateDifficulty(score) {
  // Difficulty factor based on complexity growth rate factor stored in constant
  const difficultyFactor = score * COMPLEXITY_GROWTH_RATE;

  // Enemy parameters scale slightly faster than player parameters to maintain a challenge
  const enemySpeed = BASE_ENEMY_SPEED + difficultyFactor * (BASE_ENEMY_SPEED * 1.2);
  const spawnDelay = Math.max(MIN_SPAWN_DELAY, BASE_SPAWN_DELAY - difficultyFactor * 0.5);

  const playerSpeed = BASE_PLAYER_SPEED + difficultyFactor * (BASE_PLAYER_SPEED * 0.8);
  const attackCooldown = Math.max(MIN_ATTACK_COOLDOWN, BASE_ATTACK_COOLDOWN - difficultyFactor * 0.1);
  const attackRadius = Math.min(MAX_ATTACK_RADIUS, BASE_ATTACK_RADIUS + difficultyFactor * (BASE_ATTACK_RADIUS * 0.4));

  return {
    difficultyFactor,
    spawnDelay,
    enemySpeed,
    playerSpeed,
    attackCooldown,
    attackRadius,
  };
}
