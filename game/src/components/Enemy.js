import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MIN_COLLISION_DISTANCE, HOUSE_COLLISION_RADIUS, DEFAULT_ENEMY_SPEED } from './constants.js';

export const SPAWN_POSITIONS = [
  new THREE.Vector3(-320, -320, 0),
  new THREE.Vector3(320, -320, 0),
  new THREE.Vector3(320, 320, 0),
  new THREE.Vector3(-320, 320, 0),
];

const loader = new GLTFLoader();

export function createEnemy(spawnPosition) {
  const group = new THREE.Group();
  group.position.copy(spawnPosition);

  const visual = new THREE.Group();
  group.add(visual);

  let mixer = null;

  loader.load(
    '/models/enemy.glb',
    (gltf) => {
      const model = gltf.scene;
      model.scale.setScalar(5);
      model.rotation.x = Math.PI / 2;

      const bounds = new THREE.Box3().setFromObject(model);
      model.position.z -= bounds.min.z;

      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      visual.add(model);

      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(gltf.animations[0]).play();
      }
    },
    undefined,
    () => {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(15, 30, 8),
        new THREE.MeshStandardMaterial({ color: 0xd94d4d })
      );
      cone.rotation.x = Math.PI / 2;
      cone.position.z = 15;
      cone.castShadow = true;
      cone.receiveShadow = true;
      visual.add(cone);
    }
  );

  return {
    group,
    visual,
    update(delta, playerPos, allEnemies, speed, obstacles, onPlayerCollision) {
      if (mixer) mixer.update(delta);

      const direction = new THREE.Vector3(
        playerPos.x - group.position.x,
        playerPos.y - group.position.y,
        0
      );

      const distanceToPlayer = direction.length();

      // Always rotate visual to face player
      if (distanceToPlayer > 1) {
        visual.rotation.z = Math.atan2(direction.x, -direction.y);
      }

      if (speed <= 0) return;

      // Immediate collision check before moving
      if (distanceToPlayer <= MIN_COLLISION_DISTANCE) {
        if (onPlayerCollision) onPlayerCollision();
        return;
      }

      direction.normalize();
      const step = direction.clone().multiplyScalar(speed * delta);
      const nextX = group.position.x + step.x;
      const nextY = group.position.y + step.y;

      // 1. Collision Check: Enemy vs Player
      // Handling Game Over has higher priority than collision handling
      const distToPlayerNext = Math.hypot(playerPos.x - nextX, playerPos.y - nextY);
      if (distToPlayerNext <= MIN_COLLISION_DISTANCE) {
        group.position.x = nextX;
        group.position.y = nextY;
        if (onPlayerCollision) onPlayerCollision();
        return;
      }

      // 2. Collision Check: Enemy vs other Enemies
      for (let j = 0; j < allEnemies.length; j++) {
        const other = allEnemies[j];
        if (other !== this) {
          const distToOther = Math.hypot(other.group.position.x - nextX, other.group.position.y - nextY);
          if (distToOther < MIN_COLLISION_DISTANCE) {
            return; // Blocked by other enemy
          }
        }
      }

      // 3. Collision Check: Enemy vs Obstacles (Houses)
      if (obstacles && obstacles.length > 0) {
        for (let k = 0; k < obstacles.length; k++) {
          const obs = obstacles[k];
          const distToObs = Math.hypot(obs.x - nextX, obs.y - nextY);
          if (distToObs < (obs.radius || HOUSE_COLLISION_RADIUS)) {
            return; // Blocked by house
          }
        }
      }

      // Validated as collision-free
      group.position.x = nextX;
      group.position.y = nextY;
    },
  };
}

export function createEnemyManager(scene) {
  const enemies = [];
  let isMoving = true;
  let speed = DEFAULT_ENEMY_SPEED;
  let spawnIndex = 0;

  function spawnOne(spawnPosition) {
    const enemy = createEnemy(spawnPosition);
    enemies.push(enemy);
    scene.add(enemy.group);
    return enemy;
  }

  function spawnAll() {
    SPAWN_POSITIONS.forEach((pos) => spawnOne(pos));
  }

  function spawnNext() {
    const pos = SPAWN_POSITIONS[spawnIndex % SPAWN_POSITIONS.length];
    spawnIndex++;
    return spawnOne(pos);
  }

  spawnAll();

  return {
    enemies,
    get isMoving() {
      return isMoving;
    },
    set isMoving(val) {
      isMoving = val;
    },
    get speed() {
      return speed;
    },
    set speed(val) {
      speed = val;
    },
    toggleMovement() {
      isMoving = !isMoving;
      return isMoving;
    },
    spawnOne,
    spawnAll,
    spawnNext,
    update(delta, playerPos, obstacles, onPlayerCollision) {
      const currentSpeed = isMoving ? speed : 0;
      for (let i = 0; i < enemies.length; i++) {
        enemies[i].update(delta, playerPos, enemies, currentSpeed, obstacles, onPlayerCollision);
      }
    },
    handleAttack(attackPos, radius) {
      let killedCount = 0;
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const dist = Math.hypot(e.group.position.x - attackPos.x, e.group.position.y - attackPos.y);
        if (dist <= radius) {
          scene.remove(e.group);
          enemies.splice(i, 1);
          killedCount++;
        }
      }
      return killedCount;
    },
    clear() {
      for (const enemy of enemies) {
        scene.remove(enemy.group);
      }
      enemies.length = 0;
      spawnIndex = 0;
      speed = DEFAULT_ENEMY_SPEED;
    },
  };
}
