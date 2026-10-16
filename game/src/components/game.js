import * as THREE from 'three';
import { createRenderer } from './renderer.js';
import { createCamera, updateCamera } from './camera.js';
import { createInput } from './input.js';
import { createWorld } from './world.js';
import { createPlayer } from './player.js';
import { createEnemies } from './enemies.js';
import { createHud } from './hud.js';
import { circleIntersectsBounds, circleIntersectsCircle } from './helpers.js';
import {
  PLAYER_RADIUS,
  PICKUP_COUNT,
  WORLD_BOUNDS,
} from './constants.js';

function isBlocked(x, z, radius, obstacles) {
  if (circleIntersectsBounds(x, z, radius, WORLD_BOUNDS)) {
    return true;
  }

  return obstacles.some((obstacle) =>
    circleIntersectsCircle(x, z, radius, obstacle.x, obstacle.z, obstacle.radius)
  );
}

export function startGame(canvas) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fd7ff);
  scene.fog = new THREE.Fog(0x9fd7ff, 26, 70);

  const renderer = createRenderer(canvas);
  const camera = createCamera(window.innerWidth / window.innerHeight);
  const input = createInput();

  const ambient = new THREE.HemisphereLight(0xf7f8ff, 0x7cb26b, 1.6);
  const sun = new THREE.DirectionalLight(0xffefcc, 2.3);
  sun.position.set(12, 18, 10);
  sun.castShadow = true;
  scene.add(ambient, sun);

  const world = createWorld(scene);
  const player = createPlayer(scene, world.spawnPoint);
  const enemies = createEnemies(scene);

  let score = 0;
  let state = 'playing';
  let elapsedTime = 0;

  const hud = createHud(restartGame);

  function restartGame() {
    score = 0;
    state = 'playing';
    elapsedTime = 0;

    world.pickups.forEach((pickup) => {
      pickup.collected = false;
      pickup.mesh.visible = true;
      pickup.mesh.position.y = pickup.baseY;
    });

    player.reset(world.spawnPoint);
    enemies.forEach((enemy) => enemy.reset());

    hud.setScore(score);
    hud.setStatus('Collect the glowing orbs and avoid the enemies.');
    hud.setHint(`Explore the island and grab all ${PICKUP_COUNT} orbs.`);
  }

  function endGame(message) {
    if (state !== 'playing') {
      return;
    }

    state = 'ended';
    hud.setStatus(message);
    hud.setHint('Press R, Enter, or the Restart button to play again.');
  }

  function updatePlayer(delta) {
    const movement = new THREE.Vector3(
      (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0),
      0,
      (input.isDown('down') ? 1 : 0) - (input.isDown('up') ? 1 : 0)
    );

    if (movement.lengthSq() === 0) {
      return;
    }

    movement.normalize();
    player.faceMovement(movement.x, movement.z);

    const step = movement.multiplyScalar(player.state.speed * delta);
    const nextX = player.position.x + step.x;
    if (!isBlocked(nextX, player.position.z, PLAYER_RADIUS, world.obstacles)) {
      player.position.x = nextX;
    }

    const nextZ = player.position.z + step.z;
    if (!isBlocked(player.position.x, nextZ, PLAYER_RADIUS, world.obstacles)) {
      player.position.z = nextZ;
    }
  }

  function updatePickups(delta) {
    world.pickups.forEach((pickup) => {
      if (pickup.collected) {
        return;
      }

      pickup.mesh.rotation.y += delta * 2.2;
      pickup.mesh.position.y = pickup.baseY + Math.sin(elapsedTime * 3 + pickup.spinOffset) * 0.14;

      if (
        circleIntersectsCircle(
          player.position.x,
          player.position.z,
          PLAYER_RADIUS,
          pickup.mesh.position.x,
          pickup.mesh.position.z,
          pickup.radius
        )
      ) {
        pickup.collected = true;
        pickup.mesh.visible = false;
        score += 1;
        hud.setScore(score);

        if (score >= PICKUP_COUNT) {
          endGame('All orbs collected! You rescued the island.');
        }
      }
    });
  }

  function updateEnemies(delta) {
    for (const enemy of enemies) {
      enemy.update(delta, player.position);

      if (
        circleIntersectsCircle(
          player.position.x,
          player.position.z,
          PLAYER_RADIUS,
          enemy.group.position.x,
          enemy.group.position.z,
          enemy.radius
        )
      ) {
        endGame('An enemy caught you! Press restart to try again.');
        break;
      }
    }
  }

  function animate() {
    const delta = Math.min(0.033, clock.getDelta());
    elapsedTime += delta;
    input.update();

    if (input.wasPressed('restart')) {
      restartGame();
    }

    if (state === 'playing') {
      updatePlayer(delta);
      updateEnemies(delta);
      updatePickups(delta);
    }

    updateCamera(camera, player.position, delta);
    renderer.render(scene, camera);
    frameId = window.requestAnimationFrame(animate);
  }

  const clock = new THREE.Clock();
  let frameId = window.requestAnimationFrame(animate);

  function handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  window.addEventListener('resize', handleResize);
  restartGame();
  handleResize();

  return {
    dispose() {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      hud.dispose();
      input.dispose();
      renderer.dispose();
    },
  };
}
