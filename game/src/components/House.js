import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HOUSE_COLLISION_RADIUS } from './constants.js';

const loader = new GLTFLoader();

export function createSingleHouse(x, y, biome = 'Base') {
  const group = new THREE.Group();
  group.position.set(x, y, 0);
  group.userData.isDespawned = false;

  let modelPath = '/models/small_house.glb';
  let modelScale = 65;

  if (biome === 'Snow') {
    const rand = Math.random();
    if (rand < 0.25) {
      modelPath = '/models/Snowman.glb';
      modelScale = 48;
    } else if (rand < 0.50) {
      modelPath = '/models/Pinetree.glb';
      modelScale = 16;
    } else if (rand < 0.75) {
      modelPath = '/models/Mountain.glb';
      modelScale = 80;
    } else {
      modelPath = '/models/Crystal.glb';
      modelScale = 24; // Reduced by half
    }
  } else if (biome === 'Forest') {
    const rand = Math.random();
    if (rand < 0.15) {
      modelPath = '/models/Bush.glb';
      modelScale = 30;
    } else if (rand < 0.30) {
      modelPath = '/models/Grass.glb';
      modelScale = 40;
    } else if (rand < 0.45) {
      modelPath = '/models/FlowerGroup.glb'; // Exact case matching
      modelScale = 25;
    } else if (rand < 0.725) {
      modelPath = '/models/Tree1.glb';
      modelScale = 25;
    } else {
      modelPath = '/models/Tree2.glb';
      modelScale = 12; // Reduced by half
    }
  }

  loader.load(
    modelPath,
    (gltf) => {
      // GHOST KILLER: If the level changed while this model was downloading, destroy it instantly.
      if (biome !== window.currentLevel) {
        return;
      }
      if (group.userData.isDespawned) return;

      const model = gltf.scene;
      model.scale.setScalar(modelScale);
      model.rotation.x = Math.PI / 2;
      model.rotation.y = Math.floor(Math.random() * 4) * (Math.PI / 2);

      // Snap base of model flush to Z = 0
      model.updateMatrixWorld(true);
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
    (error) => {
      // GHOST KILLER: If the level changed while this model was downloading, destroy it instantly.
      if (biome !== window.currentLevel) {
        return;
      }
      console.warn(`Failed to load ${modelPath}, falling back to placeholder`, error);
      if (group.userData.isDespawned) return;

      // Procedural tree fallback for Forest biome trees
      if (biome === 'Forest' && (modelPath.includes('Tree1') || modelPath.includes('Tree2'))) {
        const trunkGeo = new THREE.CylinderGeometry(4, 6, 30, 8);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.z = 15;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        group.add(trunk);

        const leafColors = [0x1e5928, 0x2d6b3a, 0x1a4d24];
        const leafMat = new THREE.MeshStandardMaterial({
          color: leafColors[Math.floor(Math.random() * leafColors.length)],
          roughness: 0.85,
          flatShading: true
        });

        // Bottom leaves
        const bottomGeo = new THREE.ConeGeometry(22, 30, 8);
        const bottom = new THREE.Mesh(bottomGeo, leafMat);
        bottom.position.z = 40;
        bottom.rotation.x = Math.PI / 2;
        bottom.castShadow = true;
        bottom.receiveShadow = true;
        group.add(bottom);

        // Middle leaves
        const midGeo = new THREE.ConeGeometry(16, 25, 8);
        const mid = new THREE.Mesh(midGeo, leafMat);
        mid.position.z = 55;
        mid.rotation.x = Math.PI / 2;
        mid.castShadow = true;
        mid.receiveShadow = true;
        group.add(mid);

        // Top leaves
        const topGeo = new THREE.ConeGeometry(10, 20, 8);
        const top = new THREE.Mesh(topGeo, leafMat);
        top.position.z = 68;
        top.rotation.x = Math.PI / 2;
        top.castShadow = true;
        top.receiveShadow = true;
        group.add(top);
      } else {
        let fallbackColor = 0xd7b48c;
        if (biome === 'Snow') fallbackColor = 0xffffff;
        if (biome === 'Forest') fallbackColor = 0x2e6b2e;

        const placeholder = new THREE.Mesh(
          new THREE.BoxGeometry(30, 30, 30),
          new THREE.MeshStandardMaterial({ color: fallbackColor, roughness: 0.85 })
        );
        placeholder.position.z = 15;
        placeholder.castShadow = true;
        placeholder.receiveShadow = true;
        group.add(placeholder);
      }
    }
  );

  return {
    group,
    radius: HOUSE_COLLISION_RADIUS,
    get x() { return group.position.x; },
    get y() { return group.position.y; },
  };
}
