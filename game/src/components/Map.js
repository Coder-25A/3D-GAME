import * as THREE from 'three';

const CELL_SIZE = 40;
const TILE_HEIGHT = 2;
const GENERATE_RADIUS = 18;
const DESPAWN_RADIUS = 22;

// Shared geometry for Base biome (flat checkerboard tiles)
const sharedGeometry = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, TILE_HEIGHT);
const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.95, metalness: 0 });
const lightMaterial = new THREE.MeshStandardMaterial({ color: 0x90ee90, roughness: 0.95, metalness: 0 });

let materialRefCount = 0;

function addMaterialRef() {
  materialRefCount++;
}

function releaseMaterialRef() {
  materialRefCount--;
  if (materialRefCount <= 0) {
    darkMaterial.dispose();
    lightMaterial.dispose();
  }
}

export function createMap(onHouseSpawn, onHouseDespawn) {
  const map = new THREE.Group();
  const activeTiles = new Map();
  let currentBiome = 'Base';

  addMaterialRef();

  // Generate a flat tile (used for both Base and Snow biomes)
  function generateTileAt(gridX, gridY) {
    const key = `${gridX},${gridY}`;
    if (activeTiles.has(key)) return false;

    const isEvenX = gridX % 2 === 0;
    const isEvenY = gridY % 2 === 0;
    const isDark = isEvenX === isEvenY;

    const material = isDark ? darkMaterial : lightMaterial;
    const tile = new THREE.Mesh(sharedGeometry, material);

    tile.position.x = gridX * CELL_SIZE + CELL_SIZE / 2;
    tile.position.y = gridY * CELL_SIZE + CELL_SIZE / 2;
    tile.position.z = -TILE_HEIGHT / 2;
    // Snow tiles should not receive shadows
    tile.receiveShadow = (currentBiome !== 'Snow');

    map.add(tile);
    activeTiles.set(key, { mesh: tile, gridX, gridY });
    return true; // newly generated
  }

  function generateTile(gridX, gridY) {
    return generateTileAt(gridX, gridY);
  }

  function setBiome(biome) {
    currentBiome = biome;
    if (biome === 'Snow') {
      // Pure white snow with emissive glow to erase shadows
      darkMaterial.color.setHex(0xffffff);
      lightMaterial.color.setHex(0xffffff);
      darkMaterial.emissive.setHex(0xeeeeee);
      lightMaterial.emissive.setHex(0xeeeeee);
    } else if (biome === 'Forest') {
      // Dark green ground — no checkerboard pattern
      darkMaterial.color.setHex(0x2d5a27);
      lightMaterial.color.setHex(0x2d5a27);
      darkMaterial.emissive.setHex(0x000000);
      lightMaterial.emissive.setHex(0x000000);
    } else {
      // Default Base colors
      darkMaterial.color.setHex(0x228b22);
      lightMaterial.color.setHex(0x90ee90);
      darkMaterial.emissive.setHex(0x000000);
      lightMaterial.emissive.setHex(0x000000);
      darkMaterial.roughness = 0.95;
      lightMaterial.roughness = 0.95;
      darkMaterial.metalness = 0;
      lightMaterial.metalness = 0;
    }
    // Clear existing tiles so new biome tiles regenerate with correct properties
    for (const [, tileData] of activeTiles) {
      map.remove(tileData.mesh);
    }
    activeTiles.clear();
  }

  function update(playerPos) {
    // Calculate player's current grid coordinates
    const playerGridX = Math.round(playerPos.x / CELL_SIZE);
    const playerGridY = Math.round(playerPos.y / CELL_SIZE);

    // Generate new tiles within GENERATE_RADIUS
    for (let x = -GENERATE_RADIUS; x <= GENERATE_RADIUS; x++) {
      for (let y = -GENERATE_RADIUS; y <= GENERATE_RADIUS; y++) {
        const gridX = playerGridX + x;
        const gridY = playerGridY + y;
        const isNew = generateTile(gridX, gridY);

        // If new tile, give 0.5% chance to spawn a house (reduced for more space)
        if (isNew && onHouseSpawn) {
          const worldX = gridX * CELL_SIZE;
          const worldY = gridY * CELL_SIZE;
          // Skip spawning houses within 500 units of origin
          if (Math.hypot(worldX, worldY) < 500) {
            // Don't spawn near center
          } else if (Math.random() < 0.005) {
            onHouseSpawn(worldX, worldY, gridX, gridY);
          }
        }
      }
    }

    // Despawn tiles that are too far away
    for (const [key, tileData] of activeTiles) {
      const dx = tileData.gridX - playerGridX;
      const dy = tileData.gridY - playerGridY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > DESPAWN_RADIUS) {
        // Trigger house despawn callback if registered
        if (onHouseDespawn) {
          onHouseDespawn(tileData.gridX, tileData.gridY);
        }
        map.remove(tileData.mesh);
        activeTiles.delete(key);
      }
    }
  }

  function hardReset() {
    for (const key in activeTiles) {
      if (activeTiles[key]) {
        map.remove(activeTiles[key].mesh);
        if (activeTiles[key].mesh.geometry) activeTiles[key].mesh.geometry.dispose();
        if (activeTiles[key].mesh.material) activeTiles[key].mesh.material.dispose();
      }
    }
    for (const prop of Object.getOwnPropertyNames(activeTiles)) {
      delete activeTiles[prop];
    }
    if (typeof housesByGrid !== 'undefined') {
      housesByGrid.clear();
    }
  }

  return {
    map,
    activeTiles,
    update,
    setBiome,
    hardReset,
    getTileAt(gridX, gridY) {
      return activeTiles.get(`${gridX},${gridY}`) || null;
    },
    dispose() {
      for (const [, tileData] of activeTiles) {
        map.remove(tileData.mesh);
      }
      activeTiles.clear();
      releaseMaterialRef();
    },
  };
}
