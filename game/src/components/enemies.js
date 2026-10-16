import * as THREE from 'three';
import { ENEMY_RADIUS, ENEMY_SPEED } from './constants.js';
import { createModelSlot } from './model-loader.js';

function createFallbackEnemy(color) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.68, 24, 24),
    new THREE.MeshStandardMaterial({ color, roughness: 0.75 })
  );
  body.scale.set(1, 0.8, 1.1);
  const horn = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.55, 12),
    new THREE.MeshStandardMaterial({ color: 0xffe9a3, roughness: 0.5 })
  );
  horn.position.set(0, 0.68, 0.1);
  horn.rotation.x = Math.PI;
  group.add(body, horn);
  return group;
}

function createPatrolEnemy(scene, config, color) {
  const group = createModelSlot({
    url: '/models/enemy.glb',
    targetHeight: 1.9,
    rotationY: Math.PI,
    fallbackFactory: () => createFallbackEnemy(color),
  });

  group.position.copy(config.path[0]);
  group.position.y = 0;
  scene.add(group);

  return {
    group,
    radius: ENEMY_RADIUS,
    speed: config.speed ?? ENEMY_SPEED,
    path: config.path.map((point) => point.clone()),
    index: 1,
    startPosition: config.path[0].clone(),
    isChasing: false,
    update(delta, playerPosition) {
      const target = this.path[this.index];
      const toTarget = new THREE.Vector3().subVectors(target, this.group.position);
      const distance = toTarget.length();

      if (distance < 0.2) {
        this.index = (this.index + 1) % this.path.length;
      }

      const activeTarget = this.path[this.index];
      const direction = new THREE.Vector3().subVectors(activeTarget, this.group.position);
      direction.y = 0;

      if (direction.lengthSq() > 0.0001) {
        direction.normalize();
        const step = direction.multiplyScalar(this.speed * delta);
        this.group.position.add(step);
        this.group.rotation.y = Math.atan2(step.x, step.z);
      }

      const playerDistance = this.group.position.distanceTo(playerPosition);
      this.isChasing = playerDistance < 7;
      if (this.isChasing) {
        const chase = new THREE.Vector3().subVectors(playerPosition, this.group.position);
        chase.y = 0;
        if (chase.lengthSq() > 0.0001) {
          chase.normalize();
          this.group.position.add(chase.multiplyScalar(this.speed * 0.55 * delta));
          this.group.rotation.y = Math.atan2(chase.x, chase.z);
        }
      }
    },
    reset() {
      this.group.position.copy(this.startPosition);
      this.group.position.y = 0;
      this.index = 1;
      this.isChasing = false;
    },
  };
}

export function createEnemies(scene) {
  return [
    createPatrolEnemy(
      scene,
      {
        path: [
          new THREE.Vector3(-10, 0, -10),
          new THREE.Vector3(-10, 0, 10),
          new THREE.Vector3(10, 0, 10),
          new THREE.Vector3(10, 0, -10),
        ],
      },
      0xd94d4d
    ),
    createPatrolEnemy(
      scene,
      {
        path: [
          new THREE.Vector3(-4, 0, 12),
          new THREE.Vector3(6, 0, 14),
          new THREE.Vector3(13, 0, 4),
          new THREE.Vector3(3, 0, -4),
        ],
        speed: ENEMY_SPEED * 0.9,
      },
      0x7b56d9
    ),
  ];
}
