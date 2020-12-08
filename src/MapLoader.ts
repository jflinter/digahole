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
  tileCache: Set<integer>;
  digs: Set<integer>;
  unDigs: Set<integer>;

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
      .createBlankDynamicLayer("maploader", tileset)
      .setDepth(-1)
      .fill(TILES.BLANK)
      // .fill(TILES.GRASS, 0, SKY_HEIGHT_TILES, this.map.width, 1)
      // .weightedRandomize(
      //   0,
      //   SKY_HEIGHT_TILES + 1,
      //   undefined,
      //   undefined,
      //   TILES.DIRT
      // )
      .setCollisionByExclusion([TILES.BLUE, TILES.BLANK, TILES.STONE]);
    this.tileCache = new Set();
    this.digs = new Set();
    this.unDigs = new Set();
  }

  private scaleRect(rect: Rectangle, scale: number): Rectangle {
    return new Rectangle(
      rect.centerX - (rect.centerX - rect.x) * scale,
      rect.centerY - (rect.centerY - rect.y) * scale,
      rect.width * scale,
      rect.height * scale
    );
  }

  private tileIndicesInWorldRect(rect: Rectangle): integer[] {
    const xStart = Math.max(Math.floor(this.map.worldToTileX(rect.x)), 0);
    const yStart = Math.max(Math.floor(this.map.worldToTileY(rect.y)), 0);

    // Bottom right corner of the rect, rounded up to include partial tiles
    const xEnd = Math.max(
      Math.min(
        Math.ceil(this.map.worldToTileX(rect.x + rect.width)),
        this.width
      ),
      0
    );
    const yEnd = Math.max(
      Math.min(
        Math.ceil(this.map.worldToTileY(rect.y + rect.height)),
        this.height
      ),
      0
    );

    const cartesian = (...a) =>
      a.reduce((a, b) => a.flatMap((d) => b.map((e) => _.flatten([d, e]))));
    const coords = cartesian(
      _.range(xStart, xEnd + 1),
      _.range(yStart, yEnd + 1)
    );
    return coords.map((c: integer[]) => this.indexForTile(new Vector(...c)));
  }

  private indexForTile(vec: Vector): integer {
    return vec.x + this.map.width * vec.y;
  }

  // x and y are in world coordinates
  update(visibleRect: Rectangle) {
    const tileWindow = this.scaleRect(visibleRect, 1.2);
    const ids = this.tileIndicesInWorldRect(tileWindow);
    _.forEach(ids, (id) => {
      if (!this.tileCache.has(id)) {
        this.createTile(id);
      }
    });
    for (let idx of this.tileCache) {
      if (!ids.includes(idx) && !this.digs.has(idx) && !this.unDigs.has(idx)) {
        this.removeTile(idx);
      }
    }
  }

  holeDepth(): number {
    return (
      _.max(
        _.map(
          [...this.digs.values()],
          (idx) => this.tileXYFromIndex(idx).y - SKY_HEIGHT_TILES + 1
        )
      ) || 0
    );
  }

  private createTile(idx): Phaser.Tilemaps.Tile {
    const xy = this.tileXYFromIndex(idx);
    let tileType;
    let collides = false;
    if (xy.y < SKY_HEIGHT_TILES) {
      tileType = TILES.BLANK;
    } else if (xy.y === SKY_HEIGHT_TILES) {
      tileType = TILES.GRASS;
      collides = true;
    } else {
      tileType = TILES.DIRT[0].index;
      collides = true;
    }
    const tile = this.map.putTileAt(tileType, xy.x, xy.y);
    tile.setCollision(collides);
    this.tileCache.add(idx);
    return tile;
  }

  private tileConfigAtTileXY(vector: Vector) {
    let tileType, collides;
    if (vector.y < SKY_HEIGHT_TILES) {
      tileType = TILES.BLANK;
    } else if (vector.y === SKY_HEIGHT_TILES) {
      tileType = TILES.GRASS;
      collides = true;
    } else {
      tileType = TILES.DIRT[0].index;
      collides = true;
    }
    return [tileType, collides];
  }

  getTileAtWorldXY(x: number, y: number): Phaser.Tilemaps.Tile {
    return this.map.getTileAtWorldXY(x, y);
  }

  private canDigAtTile(vector: Vector): boolean {
    const tile = this.map.getTileAt(vector.x, vector.y);
    return tile.collides;
  }

  canDigAtWorldXY(x: number, y: number): boolean {
    return this.canDigAtTile(this.worldToTileXY(x, y));
  }

  canUnDigAtWorldXY(x: number, y: number): boolean {
    return !this.canDigAtTile(this.worldToTileXY(x, y));
  }

  digTileAtWorldXY(x: number, y: number): void {
    if (!this.canDigAtWorldXY(x, y)) {
      return;
    }
    const xy = this.worldToTileXY(x, y);
    const tileType = xy.y < SKY_HEIGHT_TILES ? TILES.BLANK : TILES.STONE;
    this.digs.add(this.indexForTile(xy));
    this.unDigs.delete(this.indexForTile(xy));
    this.putTileAt(tileType, xy, false);
  }

  unDigTileAtWorldXY(x: number, y: number): void {
    if (!this.canUnDigAtWorldXY(x, y)) {
      return;
    }
    const xy = this.worldToTileXY(x, y);
    this.unDigs.add(this.indexForTile(xy));
    this.digs.delete(this.indexForTile(xy));
    this.putTileAt(TILES.DIRT[0].index, xy, true);
  }

  private putTileAt(type, vec, collides): Phaser.Tilemaps.Tile {
    const idx = this.indexForTile(vec);
    return this.map.putTileAt(type, vec.x, vec.y).setCollision(collides);
  }

  worldToTileXY(x: number, y: number): Vector {
    const xy = this.map.worldToTileXY(x, y);
    return new Vector(xy.x, xy.y);
  }

  private removeTile(idx) {
    const xy = this.tileXYFromIndex(idx);
    this.map.removeTileAt(xy.x, xy.y);
    this.tileCache.delete(idx);
  }

  private tileXYFromIndex(idx: integer): Vector {
    return new Vector(idx % this.map.width, Math.floor(idx / this.map.width));
  }

  destroy() {}
}
