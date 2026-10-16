import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { normalizeModel } from './helpers.js';

const loader = new GLTFLoader();

export function createModelSlot({ url, fallbackFactory, targetHeight = 2, rotationY = 0 }) {
  const group = new THREE.Group();

  const fallback = fallbackFactory?.();
  if (fallback) {
    group.add(fallback);
  }

  if (!url) {
    return group;
  }

  loader.load(
    url,
    (gltf) => {
      group.clear();
      const model = gltf.scene.clone(true);
      normalizeModel(model, targetHeight);
      model.rotation.y = rotationY;
      model.position.y += targetHeight / 2;
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
      // Keep the fallback mesh visible if the model cannot be loaded.
    }
  );

  return group;
}

