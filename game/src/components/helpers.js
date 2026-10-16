import * as THREE from 'three';

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function circleIntersectsCircle(ax, az, ar, bx, bz, br) {
  const dx = ax - bx;
  const dz = az - bz;
  const radius = ar + br;
  return dx * dx + dz * dz <= radius * radius;
}

export function circleIntersectsBounds(x, z, radius, bounds) {
  return (
    x - radius < bounds.minX ||
    x + radius > bounds.maxX ||
    z - radius < bounds.minZ ||
    z + radius > bounds.maxZ
  );
}

export function normalizeModel(object, targetHeight = 2) {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  object.position.sub(center);

  const height = size.y || 1;
  const scale = targetHeight / height;
  object.scale.setScalar(scale);
  return object;
}

export function createGlowMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.35,
    roughness: 0.45,
    metalness: 0.05,
  });
}
