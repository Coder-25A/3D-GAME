import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HOUSE_COLLISION_RADIUS } from './constants.js';

export function createHouses() {
  const houses = [];
  const loader = new GLTFLoader();
  const NUM_HOUSES = 3;

  // Pre-generate 3 well-distributed positions on the map that don't crowd the origin
  const housePositions = [
    { x: -160, y: 140 },
    { x: 180, y: -120 },
    { x: -140, y: -200 },
  ];

  for (let i = 0; i < NUM_HOUSES; i++) {
    const group = new THREE.Group();
    const pos = housePositions[i];
    group.position.set(pos.x, pos.y, 0);

    // Random rotation around Y axis in multiples of Math.PI / 2
    const randomRotY = Math.floor(Math.random() * 4) * (Math.PI / 2);

    loader.load(
      '/models/small_house.glb',
      (gltf) => {
        const model = gltf.scene;
        model.scale.setScalar(65);
        // Align with Z-up coordinate system
        model.rotation.x = Math.PI / 2;
        model.rotation.y = randomRotY;

        // Ensure houses sit exactly on ground level (Z = 0) by calculating bounding box
        const box = new THREE.Box3().setFromObject(model);
        model.position.z -= box.min.z;

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        group.add(model);
      },
      undefined,
      () => {
        // Fallback simple house
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(60, 60, 50),
          new THREE.MeshStandardMaterial({ color: 0xd7b48c, roughness: 0.85 })
        );
        box.position.z = 25;
        box.castShadow = true;
        box.receiveShadow = true;
        group.add(box);
      }
    );

    houses.push({
      group,
      radius: HOUSE_COLLISION_RADIUS,
      get x() {
        return group.position.x;
      },
      get y() {
        return group.position.y;
      },
    });
  }

  return houses;
}
