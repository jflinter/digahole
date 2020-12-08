import Phaser, { Tilemaps } from "phaser";
import _, { create } from "lodash";
import TILES from "./TileMapping";

export const TILE_SIZE = 128;
const TILE_SPRITESHEET = "voxel_tiles";
const SKY_HEIGHT_TILES = 4;
const CHUNK_SIZE = 1024;
const CHUNK_TILE_SCALE = CHUNK_SIZE / TILE_SIZE;

type Rectangle = Phaser.Geom.Rectangle;
const Rectangle = Phaser.Geom.Rectangle;

type Vector = Phaser.Math.Vector2;
const Vector = Phaser.Math.Vector2;

export default class MapLoader {
  private scene: Phaser.Scene;
  width: integer;
  height: integer;
  private map: Phaser.Tilemaps.Tilemap;
  layer: Tilemaps.DynamicTilemapLayer;
  tileCache: { [idx: number]: Phaser.Tilemaps.Tile } = {};

  constructor(scene: Phaser.Scene, width: integer, height: integer) {
    this.scene = scene;
    this.width = width;
    this.height = height;
    this.map = scene.make.tilemap({
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
      width: Math.round(width / TILE_SIZE),
      height: Math.round(height / TILE_SIZE),
    });
    const tileset = this.map.addTilesetImage(
      TILE_SPRITESHEET,
      undefined,
      128,
      128,
      1,
      2
    );
    this.layer = this.map
      .createBlankDynamicLayer(
        "maploader",
        tileset,
        0,
        0,
        width, // world X
        height // world Y
      )
      .setDepth(-1)
      .fill(TILES.BLANK)
      .fill(TILES.GRASS, 0, SKY_HEIGHT_TILES, 1)
      .weightedRandomize(
        0,
        SKY_HEIGHT_TILES + 1,
        undefined,
        undefined,
        TILES.DIRT
      )
      .setCollisionByExclusion([TILES.BLUE, TILES.BLANK, TILES.STONE]);
  }

  destroy() {}
}
