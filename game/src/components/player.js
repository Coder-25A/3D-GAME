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
import { audioManager } from './AudioManager.js';

export const MOVE_DURATION = JUMP_DISTANCE / MOVE_SPEED;

// Character selection configuration
export const CHARACTERS = [
  { id: 'normal', name: 'Normal Tode', path: '/models/tode.glb', scale: 28 },
  { id: 'yellow', name: 'Yellow Frog', path: '/models/YellowFrog.glb', scale: 112 },
  { id: 'classic', name: 'Classic Frog', path: '/models/Frog.glb', scale: 8 }
];

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
  let currentCharacterIndex = 0;
  player.baseScale = 28;
  player.targetScaleMultiplier = 1.0;

  // Dynamic model loader with strict isolation
  player.loadModel = function (index) {
    currentCharacterIndex = index;
    const config = CHARACTERS[index];
    player.baseScale = config.scale;

    // STRICT ISOLATION: Completely nuke the old model from memory
    if (player.model) {
      visual.remove(player.model);
      player.model.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else child.material.dispose();
          }
        }
      });
      player.model = null;
    }


    loader.load(
      config.path,
      (gltf) => {
        // If the user clicked Next very fast, ignore old downloads
        if (currentCharacterIndex !== index) return;

        try {
          const loadedModel = gltf.scene;
          console.log(`[MODEL LOAD] Success: ${config.name}`, loadedModel);

          loadedModel.name = config.name;
          loadedModel.scale.setScalar(config.scale);
          loadedModel.rotation.x = Math.PI / 2;

          // Perfect 3D Centering for the spin animation
          loadedModel.updateMatrixWorld(true);
          const bounds = new THREE.Box3().setFromObject(loadedModel);
          const center = new THREE.Vector3();
          bounds.getCenter(center);

          // Offset the model so its true center is at (0,0) and its base is at Z=0
          loadedModel.position.x = -center.x;
          loadedModel.position.y = -center.y;
          loadedModel.position.z -= bounds.min.z;

          loadedModel.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          visual.add(loadedModel);
          player.model = loadedModel;
          if (player.visible !== undefined) {
            loadedModel.visible = player.visible;
          }
          console.log(`[MODEL LOAD] ${config.name} added to scene`);
        } catch (err) {
          console.error(`[MODEL PROCESS ERROR] Failed to process ${config.name}:`, err);
          // Fallback box on processing error
          const fallbackBox = new THREE.Mesh(
            new THREE.BoxGeometry(20, 20, 20),
            new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 })
          );
          fallbackBox.position.z = 10;
          visual.add(fallbackBox);
          player.model = fallbackBox;
        }
      },
      undefined,
      (error) => {
        if (currentCharacterIndex !== index) return;
        console.error(`[MODEL ERROR] Cannot find ${config.path}. Check capitalization!`, error);

        // Bright red error box to indicate a broken file path
        const errorBox = new THREE.Mesh(
          new THREE.BoxGeometry(20, 20, 20),
          new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        errorBox.position.z = 10;
        visual.add(errorBox);
        player.model = errorBox;
      }
    );
  };


  // Load default character on startup
  player.loadModel(0);

  // Shield state variables
  player.shieldTimer = 0;
  player.isShielded = () => player.shieldTimer > 0;

  // Ultra Blast state variables
  let ultraBlast = null;
  let ultraTimer = 0;

  // Create White Forcefield Bubble — smooth, no wireframe
  const forcefieldGeo = new THREE.SphereGeometry(60, 32, 32); // Large protection radius
  const forcefieldMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x888899,
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.25,
    wireframe: false
  });
  const forcefieldMesh = new THREE.Mesh(forcefieldGeo, forcefieldMat);
  forcefieldMesh.position.z = 15;
  forcefieldMesh.visible = false;
  player.add(forcefieldMesh);

  player.activateShield = function() {
    player.shieldTimer = 10.0; // 10 seconds of invincibility
    forcefieldMesh.visible = true;
    audioManager.play('jump'); // Play a sound on pickup
  };

  // Fire Ultra Blast - massive purple shockwave
  player.fireUltraBlast = function() {
    if (ultraBlast) return;
    
    // Create a purple ring on the ground
    const geo = new THREE.RingGeometry(15, 25, 64);
    const mat = new THREE.MeshBasicMaterial({ 
      color: 0xa855f7, 
      transparent: true, 
      opacity: 1, 
      side: THREE.DoubleSide 
    });
    
    ultraBlast = new THREE.Mesh(geo, mat);
    ultraBlast.rotation.x = Math.PI / 2; // Lay it flat
    ultraBlast.position.z = 2; // Just above the ground
    
    player.add(ultraBlast);
    ultraTimer = 0.6; // Animation lasts 0.6 seconds
  };

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

    // Update Shield Timer and Animation
    if (player.shieldTimer > 0) {
      player.shieldTimer -= delta;
      
      // Spin and pulse the forcefield
      forcefieldMesh.rotation.x += delta;
      forcefieldMesh.rotation.y += delta * 1.5;
      forcefieldMesh.material.opacity = 0.3 + Math.sin(performance.now() * 0.01) * 0.2;

      if (player.shieldTimer <= 0) {
        forcefieldMesh.visible = false;
      }
    }

    // Animate Ultra Blast Shockwave
    if (ultraBlast) {
      ultraTimer -= delta;
      const progress = 1 - (ultraTimer / 0.6);

      // Scale it up incredibly fast (from 1x to 60x size)
      ultraBlast.scale.setScalar(1 + progress * 60);

      // THE CRITICAL FIX: Clamp to 0 so negative math doesn't crash the loop
      ultraBlast.material.opacity = Math.max(0, 1 - Math.pow(progress, 2));

      if (ultraTimer <= 0) {
        player.remove(ultraBlast);
        ultraBlast.geometry.dispose();
        ultraBlast.material.dispose();
        ultraBlast = null;
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

      // Play the frog jump sound
      audioManager.play('jump');
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
