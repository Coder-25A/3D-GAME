import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

export function createShieldPickupManager() {
  const shields = [];
  let currentContainer = null;

  return {
    shields,
    setContainer(container) { 
      currentContainer = container; 
    },
    spawn(playerPos) {
      if (shields.length >= 1 || !currentContainer) return;

      const angle = Math.random() * Math.PI * 2;
      // Spawn far away
      const dist = 600 + Math.random() * 500; 
      const x = playerPos.x + Math.cos(angle) * dist;
      const y = playerPos.y + Math.sin(angle) * dist;

      const group = new THREE.Group();
      group.position.set(x, y, 0);
      group.userData.isDespawned = false;
      group.userData.biome = window.currentLevel;

      loader.load('/models/Shield.glb', (gltf) => {
        if (group.userData.isDespawned || group.userData.biome !== window.currentLevel) return;

        const model = gltf.scene;
        model.scale.setScalar(28); // Same size as Tode
        model.rotation.x = Math.PI / 2;

        model.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        bounds.getCenter(center);
        model.position.set(-center.x, -center.y, -bounds.min.z + 20); // Float off ground

        // Keep the original brown color of the model
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        group.add(model);
        group.userData.model = model;
      }, undefined, (error) => {
        // Fallback if Shield.glb fails to load
        if (group.userData.isDespawned || group.userData.biome !== window.currentLevel) return;

        console.warn(`[SHIELD] Failed to load Shield.glb, using fallback`, error);

        // Create a procedural brown shield
        const shieldGeo = new THREE.SphereGeometry(14, 16, 16);
        const shieldMat = new THREE.MeshStandardMaterial({ 
          color: 0x8B4513, // Brown
          roughness: 0.6,
          metalness: 0.1
        });
        const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
        shieldMesh.position.z = 20; // Float off ground
        shieldMesh.castShadow = true;
        group.add(shieldMesh);
        group.userData.model = shieldMesh;
      });

      currentContainer.add(group);
      shields.push(group);
    },
    update(delta, playerPos) {
      for (let i = shields.length - 1; i >= 0; i--) {
        const shield = shields[i];
        // Clockwise rotation on Z axis
        shield.rotation.z += delta * 1.5;

        if (shield.userData.model) {
          // Float off ground with gentle bob
          shield.userData.model.position.z = 20 + Math.sin(performance.now() * 0.004) * 6;
        }

        if (Math.hypot(shield.position.x - playerPos.x, shield.position.y - playerPos.y) > 2000) {
          this.removeShield(i);
        }
      }

      // Spawn shield periodically - no distance requirement, 1% chance per frame
      if (shields.length < 1 && Math.random() < 0.01) {
        this.spawn(playerPos);
      }
    },
    removeShield(index) {
      const shield = shields[index];
      shield.userData.isDespawned = true;
      if (shield.parent) shield.parent.remove(shield);
      shields.splice(index, 1);
    },
    clear() {
      for (let i = shields.length - 1; i >= 0; i--) {
        this.removeShield(i);
      }
    }
  };
}
