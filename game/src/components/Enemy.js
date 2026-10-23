import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MIN_COLLISION_DISTANCE, HOUSE_COLLISION_RADIUS, DEFAULT_ENEMY_SPEED } from './constants.js';

const loader = new GLTFLoader();

export function createEnemy(spawnPosition, biome = 'Base') {
  const group = new THREE.Group();
  group.position.copy(spawnPosition);
  group.userData.isDespawned = false;

  const visual = new THREE.Group();
  group.add(visual);

  let mixer = null;
  let modelPath = '/models/enemy.glb';
  let modelScale = 5;

  if (biome === 'Snow') {
    modelPath = '/models/Dragon.glb';
    modelScale = 8;
  } else if (biome === 'Forest') {
    modelPath = '/models/Spider.glb';
    modelScale = 14;
  }

  loader.load(
    modelPath,
    (gltf) => {
      // GHOST KILLER: Prevent past stage enemies from rendering in the new stage
      if (biome !== window.currentLevel) {
        return;
      }
      if (group.userData.isDespawned) return;

      const model = gltf.scene;
      model.scale.setScalar(modelScale);
      model.rotation.x = Math.PI / 2;

      // Ensure enemy sits flush on Z = 0
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      model.position.z -= box.min.z;

      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.roughness = 0.4;
            child.material.metalness = 0.3;
          }
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
      // GHOST KILLER: Prevent past stage enemies from rendering in the new stage
      if (biome !== window.currentLevel) {
        return;
      }
      if (group.userData.isDespawned) return;
      const slimeColor = biome === 'Forest' ? 0x228b22 : 0xff2244;
      const slime = new THREE.Mesh(
        new THREE.IcosahedronGeometry(12, 1),
        new THREE.MeshPhysicalMaterial({ color: slimeColor, roughness: 0.2, clearcoat: 1.0 })
      );
      slime.position.z = 12;
      visual.add(slime);
    }
  );

  return {
    group,
    visual,
    time: Math.random() * 10,
    update(delta, playerPos, allEnemies, speed, obstacles, onPlayerCollision) {
      if (mixer) mixer.update(delta);
      this.time += delta;

      // Bobbing animation
      visual.position.z = Math.sin(this.time * 6) * 4;

      const direction = new THREE.Vector3(
        playerPos.x - group.position.x,
        playerPos.y - group.position.y,
        0
      );
      const distanceToPlayer = direction.length();

      if (distanceToPlayer > 1) {
        visual.rotation.z = Math.atan2(direction.x, -direction.y);
      }

      if (speed <= 0) return;

      if (distanceToPlayer <= MIN_COLLISION_DISTANCE) {
        if (onPlayerCollision) onPlayerCollision();
        return;
      }

      direction.normalize();
      const step = direction.clone().multiplyScalar(speed * delta);
      const nextX = group.position.x + step.x;
      const nextY = group.position.y + step.y;

      const distToPlayerNext = Math.hypot(playerPos.x - nextX, playerPos.y - nextY);
      if (distToPlayerNext <= MIN_COLLISION_DISTANCE) {
        group.position.x = nextX;
        group.position.y = nextY;
        if (onPlayerCollision) onPlayerCollision();
        return;
      }

      // Avoid other enemies
      for (let j = 0; j < allEnemies.length; j++) {
        const other = allEnemies[j];
        if (!other || !other.group || other === this) continue;
        const distToOther = Math.hypot(other.group.position.x - nextX, other.group.position.y - nextY);
        if (distToOther < MIN_COLLISION_DISTANCE) return;
      }

      // Avoid obstacles
      if (obstacles && obstacles.length > 0) {
        for (let k = 0; k < obstacles.length; k++) {
          const obs = obstacles[k];
          if (!obs) continue;
          const distToObs = Math.hypot(obs.x - nextX, obs.y - nextY);
          if (distToObs < (obs.radius || HOUSE_COLLISION_RADIUS)) return;
        }
      }

      group.position.x = nextX;
      group.position.y = nextY;
    },
  };
}

export function createEnemyManager(scene) {
  const enemies = [];
  let isMoving = true;
  let speed = DEFAULT_ENEMY_SPEED;
  let currentBiome = 'Base';

  function spawnOne(playerPos) {
    const angle = Math.random() * Math.PI * 2;
    const spawnDist = 500;
    const px = playerPos ? playerPos.x : 0;
    const py = playerPos ? playerPos.y : 0;
    const spawnPos = new THREE.Vector3(px + Math.cos(angle) * spawnDist, py + Math.sin(angle) * spawnDist, 0);

    const enemy = createEnemy(spawnPos, currentBiome);
    enemies.push(enemy);
    scene.add(enemy.group);
    return enemy;
  }

  function spawnAll(playerPos) {
    for (let i = 0; i < 4; i++) {
      spawnOne(playerPos);
    }
  }

  return {
    enemies,
    get isMoving() { return isMoving; },
    set isMoving(val) { isMoving = val; },
    get speed() { return speed; },
    set speed(val) { speed = val; },
    setBiome(biome) { currentBiome = biome; },
    spawnOne,
    spawnAll,
    spawnNext: (playerPos) => spawnOne(playerPos),
    update(delta, playerPos, obstacles, onPlayerCollision) {
      const currentSpeed = isMoving ? speed : 0;
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (!e || !e.group) continue;
        // Despawn enemies that wander too far
        const dist = Math.hypot(e.group.position.x - playerPos.x, e.group.position.y - playerPos.y);
        if (dist > 1000) {
          e.group.userData.isDespawned = true;
          scene.remove(e.group);
          enemies.splice(i, 1);
          continue;
        }
        e.update(delta, playerPos, enemies, currentSpeed, obstacles, onPlayerCollision);
      }
    },
    handleAttack(attackPos, radius) {
      let killedCount = 0;
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (!e || !e.group) continue;
        const dist = Math.hypot(e.group.position.x - attackPos.x, e.group.position.y - attackPos.y);
        if (dist <= radius) {
          e.group.userData.isDespawned = true;
          scene.remove(e.group);
          enemies.splice(i, 1);
          killedCount++;
        }
      }
      return killedCount;
    },
    clear() {
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (e && e.group) {
          e.group.userData.isDespawned = true;
          scene.remove(e.group);
        }
      }
      enemies.length = 0;
      speed = DEFAULT_ENEMY_SPEED;
    },
  };
}
