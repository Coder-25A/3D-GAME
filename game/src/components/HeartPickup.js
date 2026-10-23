import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

export function createHeartPickupManager() {
  const hearts = [];
  let currentContainer = null;

  return {
    hearts,
    setContainer(container) { 
      currentContainer = container; 
    },
    spawn(playerPos) {
      // Strictly limit to 1 active heart on the map at any time
      if (hearts.length >= 1 || !currentContainer) return;

      const angle = Math.random() * Math.PI * 2;
      // Spawn far away so the player has to travel to it
      const dist = 800 + Math.random() * 600; 
      const x = playerPos.x + Math.cos(angle) * dist;
      const y = playerPos.y + Math.sin(angle) * dist;

      const group = new THREE.Group();
      group.position.set(x, y, 0);
      group.userData.isDespawned = false;
      group.userData.biome = window.currentLevel;

      loader.load('/models/Heart.glb', (gltf) => {
        if (group.userData.isDespawned || group.userData.biome !== window.currentLevel) return;

        const model = gltf.scene;
        model.scale.setScalar(18); // Slightly larger than coins so it's visible
        model.rotation.x = Math.PI / 2; // Convert from Y-up to Z-up coordinate system
        
        model.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        bounds.getCenter(center);
        model.position.set(-center.x, -center.y, -bounds.min.z + 15);

        // Bright red glowing material
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.material = new THREE.MeshStandardMaterial({ 
              color: 0xff1144, 
              emissive: 0x660011,
              roughness: 0.2
            });
          }
        });

        group.add(model);
        group.userData.model = model;
      }, undefined, (error) => {
        // Fallback if Heart.glb fails to load
        if (group.userData.isDespawned || group.userData.biome !== window.currentLevel) return;

        // Procedural heart fallback
        const heartGeo = new THREE.SphereGeometry(10, 8, 8);
        const heartMat = new THREE.MeshStandardMaterial({ 
          color: 0xff1144, 
          emissive: 0x660011,
          roughness: 0.2
        });
        const heartMesh = new THREE.Mesh(heartGeo, heartMat);
        heartMesh.position.z = 15;
        heartMesh.castShadow = true;
        group.add(heartMesh);
        group.userData.model = heartMesh;
      });

      currentContainer.add(group);
      hearts.push(group);
    },
    update(delta, playerPos) {
      for (let i = hearts.length - 1; i >= 0; i--) {
        const heart = hearts[i];
        heart.rotation.z += delta * 1.5; // Spin slowly

        if (heart.userData.model) {
          // Bob up and down
          heart.userData.model.position.z = 15 + Math.sin(performance.now() * 0.004) * 6;
        }

        // Despawn if left behind
        if (Math.hypot(heart.position.x - playerPos.x, heart.position.y - playerPos.y) > 2000) {
          this.removeHeart(i);
        }
      }

      // STRICT RULES FOR SPAWNING:
      // 1. Player must be at least 1500 units away from the start (0,0)
      // 2. Extremely rare (0.2% chance per frame)
      const distanceFromStart = Math.hypot(playerPos.x, playerPos.y);
      if (distanceFromStart > 1500 && hearts.length < 1 && Math.random() < 0.002) {
        this.spawn(playerPos);
      }
    },
    removeHeart(index) {
      const heart = hearts[index];
      heart.userData.isDespawned = true;
      if (heart.parent) heart.parent.remove(heart);
      hearts.splice(index, 1);
    },
    clear() {
      for (let i = hearts.length - 1; i >= 0; i--) {
        this.removeHeart(i);
      }
    }
  };
}
