import * as THREE from 'three';

export function createMap() {
  const map = new THREE.Group();

  const GRID_SIZE = 36;
  const CELL_SIZE = 40;
  const TILE_HEIGHT = 2;

  const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.95, metalness: 0 });
  const lightMaterial = new THREE.MeshStandardMaterial({ color: 0x90ee90, roughness: 0.95, metalness: 0 });

  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      const isEvenX = x % 2 === 0;
      const isEvenY = y % 2 === 0;
      const isDark = isEvenX === isEvenY;

      const material = isDark ? darkMaterial : lightMaterial;
      const tile = new THREE.Mesh(new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, TILE_HEIGHT), material);

      tile.position.x = (x - GRID_SIZE / 2) * CELL_SIZE + CELL_SIZE / 2;
      tile.position.y = (y - GRID_SIZE / 2) * CELL_SIZE + CELL_SIZE / 2;
      tile.position.z = -TILE_HEIGHT / 2;
      tile.receiveShadow = true;

      map.add(tile);
    }
  }

  return map;
}
