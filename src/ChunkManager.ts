import Phaser, { Tilemaps } from "phaser";
import _, { create } from "lodash";

import Player from "./Player";
import TILES from "./TileMapping";

type ChunkCallback = (this: void, e: Chunk) => void;

/**
 * In which we manage the chunks
 */
class Chunk {
  dirty: boolean = false;
  public id: integer;
  private scene: Phaser.Scene;
  layer: Phaser.Tilemaps.DynamicTilemapLayer;
  private colliders: Phaser.Physics.Arcade.Collider[] = [];

  constructor(scene, layer, id) {
    this.scene = scene;
    this.layer = layer;
    this.id = id;
  }

  isEmpty() {
    return this.dirty;
  }

  getTileAtWorldXY(x: integer, y: integer): Phaser.Tilemaps.Tile {
    return this.layer.getTileAtWorldXY(x, y);
  }

  putTileAtWorldXY(tile: number, x: integer, y: integer): Phaser.Tilemaps.Tile {
    this.dirty = true;
    return this.layer.putTileAtWorldXY(tile, x, y);
  }

  destroy() {
    this.layer.destroy();
    this.colliders.forEach((c) => c.destroy());
  }

  collideWith(obj) {
    const collider = this.scene.physics.add.collider(obj, this.layer);
    this.colliders.push(collider);
  }
}

export const TILE_SIZE = 128;
const TILE_SPRITESHEET = "voxel_tiles";
const CHUNK_SIZE = 1024;
const CHUNK_TILE_SCALE = CHUNK_SIZE / TILE_SIZE;

export default class ChunkManager {
  scene: Phaser.Scene;
  width: integer;
  height: integer;
  map: Phaser.Tilemaps.Tilemap;
  tileset: Phaser.Tilemaps.Tileset;
  chunks: { [key: number]: Chunk };
  chunkCreatedCallbacks: ChunkCallback[] = [];

  constructor(scene: Phaser.Scene, width: integer, height: integer) {
    this.scene = scene;
    this.width = width;
    this.height = height;
    this.map = scene.make.tilemap({
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
      width: Math.round(width / TILE_SIZE),
      height: Math.round(width / TILE_SIZE),
    });
    this.tileset = this.map.addTilesetImage(
      TILE_SPRITESHEET,
      undefined,
      128,
      128,
      1,
      2
    );
    this.chunks = {};
  }

  chunkWidth() {
    return this.width / CHUNK_SIZE;
  }

  chunkHeight() {
    return this.height / CHUNK_SIZE;
  }

  toChunkID(x, y) {
    return y * this.chunkWidth() + x;
  }

  fromChunkID(id) {
    return [id % this.chunkWidth(), Math.floor(id / this.chunkWidth())];
  }

  createChunk(id: number): Chunk {
    if (this.chunks[id]) {
      return this.chunks[id];
    }

    // note: these operations work in tile units
    const skyHeight = 4;
    const [chunkX, chunkY] = this.fromChunkID(id);
    let layer = this.map
      .createBlankDynamicLayer(
        `${id}`,
        this.tileset,
        chunkX * CHUNK_SIZE, // world X
        chunkY * CHUNK_SIZE, // world Y
        CHUNK_TILE_SCALE, // width in tiles
        CHUNK_TILE_SCALE // width in tiles
      )
      .setDepth(-1);
    if (chunkY === 0) {
      layer = layer
        .fill(TILES.BLANK)
        .fill(TILES.GRASS, 0, skyHeight, CHUNK_TILE_SCALE, 1)
        .weightedRandomize(
          0,
          skyHeight + 1,
          CHUNK_TILE_SCALE,
          CHUNK_TILE_SCALE - skyHeight - 1,
          TILES.DIRT
        )
        .setCollisionByExclusion([TILES.BLUE, TILES.BLANK, TILES.STONE]);
    } else {
      layer = layer
        .weightedRandomize(
          undefined,
          undefined,
          undefined,
          undefined,
          TILES.DIRT
        )
        .setCollisionByExclusion([TILES.BLUE, TILES.BLANK, TILES.STONE]);
    }
    const chunk = new Chunk(this.scene, layer, id);
    this.chunks[id] = chunk;
    this.chunkCreatedCallbacks.forEach((cb) => cb(chunk));
    return chunk;
  }

  removeChunk(id: integer) {
    const chunk = this.chunks[id];
    chunk.destroy();
    delete this.chunks[id];
  }

  onChunkCreated(cb: ChunkCallback) {
    this.chunkCreatedCallbacks.push(cb);
  }

  private chunkAtWorldXY(x, y) {
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);
    const chunkID = this.toChunkID(chunkX, chunkY);
    return this.chunks[chunkID];
  }

  getTileAtWorldXY(x: integer, y: integer): Phaser.Tilemaps.Tile {
    return this.chunkAtWorldXY(x, y).getTileAtWorldXY(x, y);
  }

  putTileAtWorldXY(tile: number, x: integer, y: integer): Phaser.Tilemaps.Tile {
    return this.chunkAtWorldXY(x, y).putTileAtWorldXY(tile, x, y);
  }

  visibleChunkIds(rect: Phaser.Geom.Rectangle) {
    const minX = Math.max(0, Math.floor(rect.x / CHUNK_SIZE));
    const minY = Math.max(0, Math.floor(rect.y / CHUNK_SIZE));
    const maxX = Math.max(0, Math.floor((rect.x + rect.width) / CHUNK_SIZE));
    const maxY = Math.max(0, Math.floor((rect.y + rect.height) / CHUNK_SIZE));
    const cartesian = (...a) =>
      a.reduce((a, b) => a.flatMap((d) => b.map((e) => _.flatten([d, e]))));
    const coords = cartesian(_.range(minX, maxX + 1), _.range(minY, maxY + 1));
    return coords.map((c) => this.toChunkID(c[0], c[1]));
  }

  scaleRect(rect: Phaser.Geom.Rectangle, scale: number): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      rect.centerX - (rect.centerX - rect.x) * scale,
      rect.centerY - (rect.centerY - rect.y) * scale,
      rect.width * scale,
      rect.height * scale
    );
  }

  // x and y are in world coordinates
  update(visibleRect: Phaser.Geom.Rectangle) {
    const ids = this.visibleChunkIds(this.scaleRect(visibleRect, 1.2));
    _.forEach(ids, (id) => {
      if (!this.chunks[id]) {
        console.log(`creating chunk ${id}`);
        this.createChunk(id);
      }
    });
    _.forEach(this.chunks, (chunk) => {
      if (!ids.includes(chunk.id) && !chunk.isEmpty()) {
        console.log(`destroying chunk ${chunk.id}`);
        this.removeChunk(chunk.id);
      }
    });
  }

  destroy() {}
}
