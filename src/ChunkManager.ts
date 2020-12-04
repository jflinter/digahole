import Phaser from "phaser";
import _ from "lodash";

import Player from "./Player";
import TILES from "./TileMapping";

type LayerCallback = (
  this: void,
  e: Phaser.Tilemaps.DynamicTilemapLayer
) => void;

/**
 * In which we manage the chunks
 */
class Chunk {
  x: integer;
  y: integer;
  layer: Phaser.Tilemaps.DynamicTilemapLayer;

  constructor(layer, x, y) {
    this.layer = layer;
    this.x = x;
    this.y = y;
  }

  isEmpty() {
    return false;
  }
}

const TILE_SIZE = 128;
const TILE_SPRITESHEET = "voxel_tiles";
const SCALE_FACTOR = 1; // how much larger is the map than the provided window

export default class ChunkManager {
  map: Phaser.Tilemaps.Tilemap;
  tileset: Phaser.Tilemaps.Tileset;
  chunks: Chunk[];
  chunkWidthInTiles: integer;
  chunkHeightInTiles: integer;
  layerCreatedCallbacks: LayerCallback[] = [];

  constructor(scene: Phaser.Scene, width: integer, height: integer) {
    this.chunkWidthInTiles = Math.floor(width / TILE_SIZE);
    this.chunkHeightInTiles = Math.floor(width / TILE_SIZE);
    this.map = scene.make.tilemap({
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
      width: Math.floor(width / TILE_SIZE) * SCALE_FACTOR,
      height: Math.floor(height / TILE_SIZE) * SCALE_FACTOR,
    });
    this.tileset = this.map.addTilesetImage(
      TILE_SPRITESHEET,
      undefined,
      TILE_SIZE,
      TILE_SIZE,
      1,
      2
    );
    this.chunks = [];
    this.createChunk(0, 0);
  }

  createChunk(chunkX: number, chunkY: number): Chunk {
    // note: these operations work in tile units
    const id = Math.random().toString(36).substring(7);
    const skyHeight = this.chunkHeightInTiles / 3;
    const layer = this.map
      .createBlankDynamicLayer(
        `chunk_${chunkX}_${chunkY}_${id}`,
        this.tileset,
        chunkX * 0, // TODO, world X
        chunkY * 0, // TODO, world Y
        this.chunkWidthInTiles, // width in tiles
        this.chunkHeightInTiles // width in tiles
      )
      .fill(TILES.GRASS, 0, skyHeight, this.chunkWidthInTiles, 1)
      .weightedRandomize(
        0,
        skyHeight + 1,
        this.chunkWidthInTiles,
        this.chunkHeightInTiles - skyHeight - 1,
        TILES.DIRT
      )
      .setCollisionByExclusion([TILES.BLANK, TILES.STONE]);
    const chunk = new Chunk(layer, chunkX, chunkY);
    this.chunks.push(chunk);
    return chunk;
  }

  onLayerCreated(
    cb: (this: void, e: Phaser.Tilemaps.DynamicTilemapLayer) => void
  ) {
    this.layerCreatedCallbacks.push(cb);
  }

  update() {}

  destroy() {}
}
