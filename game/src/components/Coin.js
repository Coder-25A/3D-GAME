import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

export function createCoinManager() {
  const coins = [];
  let currentContainer = null;

  return {
    coins,
    setContainer(container) { 
      currentContainer = container; 
    },
    spawn(playerPos) {
      if (coins.length >= 4 || !currentContainer) return;

      const angle = Math.random() * Math.PI * 2;
      // Spawn far enough away to be discovered, but not too far
      const dist = 400 + Math.random() * 600; 
      const x = playerPos.x + Math.cos(angle) * dist;
      const y = playerPos.y + Math.sin(angle) * dist;

      // Ensure coins don't spawn too close to each other
      for (const c of coins) {
        if (Math.hypot(c.position.x - x, c.position.y - y) < 300) return;
      }

      const group = new THREE.Group();
      group.position.set(x, y, 0);
      group.userData.isDespawned = false;
      group.userData.biome = window.currentLevel;

      loader.load('/models/Coin.glb', (gltf) => {
        // Ghost killer: Prevent loading if level changed or coin despawned
        if (group.userData.isDespawned || group.userData.biome !== window.currentLevel) return;

        const model = gltf.scene;
        model.scale.setScalar(28); // Matches Tode's size
        model.rotation.x = Math.PI / 2;

        // Center perfectly and float off the ground
        model.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(model);
        const center = new THREE.Vector3();
        bounds.getCenter(center);
        model.position.set(-center.x, -center.y, -bounds.min.z + 15);

        // Force a shiny gold material
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            if (child.material) {
              child.material.color = new THREE.Color(0xffdf00); // Gold
              child.material.metalness = 0.9;
              child.material.roughness = 0.1;
            }
          }
        });

        group.add(model);
        group.userData.model = model;
      }, undefined, (error) => {
        // Fallback if Coin.glb fails to load
        if (group.userData.isDespawned || group.userData.biome !== window.currentLevel) return;
        
        // Create a procedural gold coin
        const coinGeo = new THREE.CylinderGeometry(12, 12, 4, 16);
        const coinMat = new THREE.MeshStandardMaterial({ 
          color: 0xffdf00, 
          metalness: 0.9, 
          roughness: 0.1 
        });
        const coinMesh = new THREE.Mesh(coinGeo, coinMat);
        coinMesh.rotation.x = Math.PI / 2;
        coinMesh.position.z = 15;
        coinMesh.castShadow = true;
        group.add(coinMesh);
        group.userData.model = coinMesh;
      });

      currentContainer.add(group);
      coins.push(group);
    },
    update(delta, playerPos) {
      for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        coin.rotation.z += delta * 2; // Continuous spin

        if (coin.userData.model) {
          // Smooth bobbing effect up and down
          coin.userData.model.position.z = 15 + Math.sin(performance.now() * 0.005) * 5;
        }

        // Despawn if the player wanders too far away (recycles the coin)
        if (Math.hypot(coin.position.x - playerPos.x, coin.position.y - playerPos.y) > 1500) {
          this.removeCoin(i);
        }
      }

      // 2% chance every frame to spawn a coin if we have less than 4
      if (coins.length < 4 && Math.random() < 0.02) {
        this.spawn(playerPos);
      }
    },
    removeCoin(index) {
      const coin = coins[index];
      coin.userData.isDespawned = true;
      if (coin.parent) coin.parent.remove(coin);
      coins.splice(index, 1);
    },
    clear() {
      for (let i = coins.length - 1; i >= 0; i--) {
        this.removeCoin(i);
      }
    }
  };
}
