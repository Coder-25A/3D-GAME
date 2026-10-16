import * as THREE from 'three';
import { createGlowMaterial } from './helpers.js';
import { PICKUP_COUNT, PICKUP_RADIUS } from './constants.js';
import { createModelSlot } from './model-loader.js';

function createFenceSegment(width, height, depth, color) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.05 })
  );
}

function createPickup(position, color) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 24, 24),
    createGlowMaterial(color)
  );
  mesh.position.copy(position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return {
    mesh,
    radius: PICKUP_RADIUS,
    collected: false,
    baseY: position.y,
    spinOffset: Math.random() * Math.PI * 2,
  };
}

export function createWorld(scene) {
  const world = new THREE.Group();
  scene.add(world);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 70, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x6ebd5a, roughness: 1, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  world.add(floor);

  const pond = new THREE.Mesh(
    new THREE.CircleGeometry(6, 32),
    new THREE.MeshStandardMaterial({ color: 0x4ea4d8, transparent: true, opacity: 0.84 })
  );
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(-11, 0.02, 10);
  world.add(pond);

  const fenceMaterial = 0x8a5a34;
  const perimeter = [
    createFenceSegment(40, 1.5, 0.8, fenceMaterial),
    createFenceSegment(40, 1.5, 0.8, fenceMaterial),
    createFenceSegment(0.8, 1.5, 40, fenceMaterial),
    createFenceSegment(0.8, 1.5, 40, fenceMaterial),
  ];
  perimeter[0].position.set(0, 0.75, -18.6);
  perimeter[1].position.set(0, 0.75, 18.6);
  perimeter[2].position.set(-18.6, 0.75, 0);
  perimeter[3].position.set(18.6, 0.75, 0);
  perimeter.forEach((segment) => {
    segment.castShadow = true;
    segment.receiveShadow = true;
    world.add(segment);
  });

  const house = createModelSlot({
    url: '/models/small_house.glb',
    targetHeight: 3.2,
    rotationY: Math.PI,
    fallbackFactory: () => {
      const group = new THREE.Group();
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(3, 2, 3),
        new THREE.MeshStandardMaterial({ color: 0xd7b48c, roughness: 0.85 })
      );
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(2.4, 1.2, 4),
        new THREE.MeshStandardMaterial({ color: 0x8f4d2d, roughness: 0.95 })
      );
      roof.position.y = 1.5;
      roof.rotation.y = Math.PI / 4;
      group.add(base, roof);
      return group;
    },
  });
  house.position.set(0, 0.02, 0);
  world.add(house);

  const rockPositions = [
    [-6, -8],
    [7, -5],
    [10, 11],
    [-11, 2],
  ];
  const obstacles = [
    { x: 0, z: 0, radius: 3.6 },
    ...rockPositions.map(([x, z]) => ({ x, z, radius: 1.2 })),
  ];

  for (const [x, z] of rockPositions) {
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.9, 0),
      new THREE.MeshStandardMaterial({ color: 0x8d9497, roughness: 1 })
    );
    rock.position.set(x, 0.75, z);
    rock.castShadow = true;
    rock.receiveShadow = true;
    world.add(rock);
  }

  const pickupPlacements = [
    [-14, -10],
    [-11, 14],
    [-3, -15],
    [8, -11],
    [13, 9],
    [-2, 12],
  ];

  const pickups = pickupPlacements.slice(0, PICKUP_COUNT).map(([x, z], index) => {
    const pickup = createPickup(new THREE.Vector3(x, 0.55, z), 0xffe26b + index * 3500);
    world.add(pickup.mesh);
    return pickup;
  });

  const spawnPoint = new THREE.Vector3(-15, 0, -15);

  return {
    world,
    spawnPoint,
    obstacles,
    pickups,
  };
}
