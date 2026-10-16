import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  MIN_COLLISION_DISTANCE,
  JUMP_HEIGHT,
  JUMP_DISTANCE,
  MOVE_SPEED,
  ATTACK_COOLDOWN,
  ATTACK_RADIUS,
} from './constants.js';

export const MOVE_DURATION = JUMP_DISTANCE / MOVE_SPEED;

// Camera view is at (300, -300, 300) looking at (0, 0, 0)
export const DIRECTIONS = {
  ArrowUp: { x: -Math.SQRT1_2, y: Math.SQRT1_2, angle: -Math.PI * 0.75 },
  ArrowDown: { x: Math.SQRT1_2, y: -Math.SQRT1_2, angle: Math.PI * 0.25 },
  ArrowLeft: { x: -Math.SQRT1_2, y: -Math.SQRT1_2, angle: -Math.PI * 0.25 },
  ArrowRight: { x: Math.SQRT1_2, y: Math.SQRT1_2, angle: Math.PI * 0.75 },
};

const KEY_MAP = {
  ArrowUp: 'ArrowUp',
  KeyW: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  KeyS: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  KeyA: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  KeyD: 'ArrowRight',
};

export function createPlayer(scene) {
  const player = new THREE.Group();
  player.position.set(0, 0, 0);

  const visual = new THREE.Group();
  player.add(visual);

  let model = null;
  const loader = new GLTFLoader();
  loader.load('/models/tode.glb', (gltf) => {
    model = gltf.scene;
    model.name = 'Tode';
    model.scale.setScalar(20);
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
    player.model = model;
    player.visual = visual;
    if (player.visible !== undefined) {
      model.visible = player.visible;
    }
  });

  player.enabled = true;

  player.setVisible = function (visible) {
    player.visible = visible;
    if (visual) visual.visible = visible;
    if (player.model) player.model.visible = visible;
  };

  const inputQueue = [];
  let currentMove = null;
  let attackCooldownTimer = 0;
  let activeAttackCircle = null;
  let attackCircleTimer = 0;

  const attackGeometry = new THREE.CircleGeometry(ATTACK_RADIUS, 32);
  const attackMaterial = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
  });

  const onKeyDown = (event) => {
    if (!player.enabled) return;

    if (event.code === 'Space') {
      event.preventDefault();
      tryAttack();
      return;
    }

    const direction = KEY_MAP[event.code];
    if (!direction) return;
    event.preventDefault();
    if (!event.repeat) {
      inputQueue.push(direction);
    }
  };

  player.reset = function () {
    inputQueue.length = 0;
    currentMove = null;
    visual.position.set(0, 0, 0);
    player.position.set(0, 0, 0);
    visual.rotation.z = -Math.PI * 0.75;
    attackCooldownTimer = 0;
    if (activeAttackCircle && activeAttackCircle.parent) {
      activeAttackCircle.parent.remove(activeAttackCircle);
    }
    activeAttackCircle = null;
    player.setVisible(true);
    player.enabled = true;
    player.moveSpeed = MOVE_SPEED;
    player.attackCooldown = ATTACK_COOLDOWN;
    player.attackRadius = ATTACK_RADIUS;
  };

  player.moveSpeed = MOVE_SPEED;
  player.attackCooldown = ATTACK_COOLDOWN;
  player.attackRadius = ATTACK_RADIUS;

  function tryAttack() {
    if (attackCooldownTimer > 0) return;

    const cooldown = player.attackCooldown || ATTACK_COOLDOWN;
    const radius = player.attackRadius || ATTACK_RADIUS;

    attackCooldownTimer = cooldown;

    if (activeAttackCircle && activeAttackCircle.parent) {
      activeAttackCircle.parent.remove(activeAttackCircle);
    }

    const currentAttackGeometry = new THREE.CircleGeometry(radius, 32);
    activeAttackCircle = new THREE.Mesh(currentAttackGeometry, attackMaterial);
    activeAttackCircle.position.set(player.position.x, player.position.y, 0.25);
    scene.add(activeAttackCircle);
    attackCircleTimer = 0.25;

    if (player.onAttack) {
      player.onAttack(player.position, radius);
    }
  }

  window.addEventListener('keydown', onKeyDown);

  player.update = function (delta) {
    if (!player.enabled) return;

    if (attackCooldownTimer > 0) {
      attackCooldownTimer = Math.max(0, attackCooldownTimer - delta);
    }

    if (activeAttackCircle) {
      attackCircleTimer -= delta;
      if (attackCircleTimer <= 0) {
        scene.remove(activeAttackCircle);
        activeAttackCircle = null;
      }
    }

    if (currentMove?.completed) {
      currentMove = null;
    }

    if (!currentMove && inputQueue.length > 0) {
      const direction = inputQueue.shift();
      const facing = DIRECTIONS[direction];
      const { x, y } = facing;
      const targetX = player.position.x + x * JUMP_DISTANCE;
      const targetY = player.position.y + y * JUMP_DISTANCE;

      // Rotate model to face direction of intended move
      if (facing) {
        visual.rotation.z = facing.angle;
      }

      // Collision Check: Only start move if intended new position is clear of collisions
      if (player.canMove && !player.canMove(targetX, targetY)) {
        // Blocked by collision - do not initiate movement into occupied space
        return;
      }

      const speed = player.moveSpeed || MOVE_SPEED;
      const duration = JUMP_DISTANCE / speed;

      currentMove = {
        direction,
        progress: 0,
        completed: false,
        startPosition: player.position.clone(),
        duration,
      };
    }

    if (!currentMove) {
      visual.position.z = 0;
      return;
    }

    currentMove.progress = Math.min(1, currentMove.progress + delta / currentMove.duration);
    const { x, y } = DIRECTIONS[currentMove.direction];
    const distance = JUMP_DISTANCE * currentMove.progress;

    const jumpHeight = Math.sin(currentMove.progress * Math.PI) * JUMP_HEIGHT;
    visual.position.z = jumpHeight;

    player.position.x = currentMove.startPosition.x + x * distance;
    player.position.y = currentMove.startPosition.y + y * distance;

    if (currentMove.progress >= 1) {
      player.position.x = currentMove.startPosition.x + x * JUMP_DISTANCE;
      player.position.y = currentMove.startPosition.y + y * JUMP_DISTANCE;
      visual.position.z = 0;
      currentMove.completed = true;
    }
  };

  player.dispose = function () {
    window.removeEventListener('keydown', onKeyDown);
    if (activeAttackCircle && activeAttackCircle.parent) {
      activeAttackCircle.parent.remove(activeAttackCircle);
    }
  };

  Object.defineProperty(player, 'currentMove', {
    get() {
      return currentMove;
    },
  });

  Object.defineProperty(player, 'inputQueue', {
    get() {
      return inputQueue;
    },
  });

  return player;
}
