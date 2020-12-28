import Phaser, { Tilemaps } from "phaser";
import _, { create, xor } from "lodash";
import Chance from "chance";

import { TileKey } from "./TileKey";
import PersistentStore, { Change } from "./PersistentStore";
import absurd from "./absurd";

export const TILE_SIZE = 128;
const SKY_HEIGHT_TILES = 4;
const CHUNK_SIZE = 1024;
const CHUNK_TILE_SCALE = CHUNK_SIZE / TILE_SIZE;

const TILE_SPRITESHEET = "voxel_tiles";

type Rectangle = Phaser.Geom.Rectangle;
const Rectangle = Phaser.Geom.Rectangle;

type Vector = Phaser.Math.Vector2;
const Vector = Phaser.Math.Vector2;

export default class MapLoader {
  private scene: Phaser.Scene;
  width: integer;
  height: integer;
  private map: Phaser.Tilemaps.Tilemap;
  layer: Tilemaps.TilemapLayer;
  tileCache: Set<integer>;
  private tileChances: integer[];

  public static preload(scene: Phaser.Scene) {
    scene.load.spritesheet(
      TILE_SPRITESHEET,
      "../assets/images/spritesheet_tiles_extruded.png",
      {
        frameWidth: 128,
        frameHeight: 128,
        margin: 1,
        spacing: 2,
      }
    );
  }

  constructor(
    scene: Phaser.Scene,
    seed: number,
    width: integer,
    height: integer
  ) {
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
      .createBlankLayer("maploader", tileset)
      .setDepth(-1)
      .fill(TileKey.BLANK)
      .setCollisionByExclusion([TileKey.BLUE, TileKey.BLANK, TileKey.STONE]);
    this.tileCache = new Set();
    let changes = PersistentStore.shared().getChanges();
    changes.forEach((change, idx) => {
      switch (change) {
        case Change.DELETE:
          this.digTile(this.tileXYFromIndex(idx), false);
          break;
        case Change.PLACE_DIRT:
          this.unDigTile(this.tileXYFromIndex(idx), TileKey.DIRT, false);
          break;
        case Change.PLACE_MUSHROOM:
          this.unDigTile(
            this.tileXYFromIndex(idx),
            TileKey.STONE_WITH_MUSHROOM,
            false
          );
          break;
        default:
          absurd(change);
      }
    });

    // hack: generate a large array to prevent repeats in the tile array
    // there is definitely a better way to do this
    this.tileChances = new Chance(
      PersistentStore.shared().getRandomSeed()
    ).shuffle([
      ...Array(700).fill(TileKey.DIRT),
      ...Array(200).fill(TileKey.SANDY_DIRT),
      ...Array(130).fill(TileKey.LIGHT_STONE),
      ...Array(40).fill(TileKey.STONE_WITH_MUSHROOM),
    ]);
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
      if (
        !ids.includes(idx) &&
        !PersistentStore.shared().getChanges().has(idx)
      ) {
        this.removeTile(idx);
      }
    }
  }

  holeIslands = (xys: [number, number][]) => {
    const islands: [number, number][][] = [];
    const unassigned = xys;
    const neighbors = (a: [number, number], b: [number, number]): boolean => {
      const x = Math.abs(a[0] - b[0]);
      const y = Math.abs(a[1] - b[1]);
      return (x === 0 && y === 1) || (x === 1 && y == 0);
    };
    while (unassigned.length > 0) {
      const xy = unassigned.pop() as [number, number];
      let currentIsland = [xy];
      while (true) {
        const vs = _.remove(unassigned, (v) => {
          return _.find(currentIsland, (i) => neighbors(i, v));
        }) as [number, number][];
        if (vs.length === 0) {
          break;
        }
        currentIsland = currentIsland.concat(vs);
      }
      islands.push(currentIsland);
    }
    return islands;
  };

  holeDepth(): [number, boolean] {
    const points: [number, number][] = _.compact(
      [...PersistentStore.shared().getChanges()].map(([idx, change]) => {
        let xy = this.tileXYFromIndex(idx);
        return change == Change.DELETE ? [xy.x, xy.y] : null;
      })
    );
    const islands = this.holeIslands(points);
    const atSurface = _.filter(islands, (island) =>
      _.some(island, (p) => p[1] <= SKY_HEIGHT_TILES)
    );
    const depth =
      _.max(_.flatten(atSurface).map((p) => p[1] - SKY_HEIGHT_TILES + 1)) || 0;
    return [depth, atSurface.length < islands.length];
  }

  private static onMushroom(
    sprite: Phaser.Physics.Arcade.Sprite,
    collisionTile: Phaser.Tilemaps.Tile,
    ctx
  ): boolean {
    const yDelta =
      sprite.body.bottom - collisionTile.tilemap.tileToWorldY(collisionTile.y);
    if (yDelta < 10 && yDelta > 0) {
      const onDirt =
        collisionTile.tilemap
          .getTilesWithinWorldXY(
            sprite.body.left,
            sprite.body.bottom,
            sprite.body.width,
            1
          )
          .filter((t) =>
            [TileKey.DIRT, TileKey.SANDY_DIRT, TileKey.LIGHT_STONE].includes(
              t.index
            )
          ).length !== 0;
      if (!onDirt) {
        sprite.setVelocityY(-1500);
        collisionTile.tilemap.scene.cameras.main.shake(70, 0.02);
        return true;
      }
    }
    return false;
  }

  private createTile(idx): Phaser.Tilemaps.Tile {
    const xy = this.tileXYFromIndex(idx);
    let tileType = this.tileTypeAtTileXY(xy);
    const tile = this.putTileAt(tileType, xy);
    this.tileCache.add(idx);
    return tile;
  }

  private tileTypeAtTileXY(vector: Vector): TileKey {
    if (vector.y < SKY_HEIGHT_TILES) {
      return TileKey.BLANK;
    } else if (vector.y === SKY_HEIGHT_TILES) {
      return TileKey.GRASS;
    } else {
      return this.tileChances[
        this.indexForTile(vector) % this.tileChances.length
      ];
    }
  }

  getTileAtWorldXY(x: number, y: number): Phaser.Tilemaps.Tile {
    return this.map.getTileAtWorldXY(x, y);
  }

  canDigAtTile(vector: Vector): boolean {
    const tile = this.map.getTileAt(vector.x, vector.y);
    if (!tile) return false;
    const tileKey = tile.index as TileKey;
    return TileKey.destructible(tileKey);
  }

  canDigAtWorldXY(x: number, y: number): boolean {
    return this.canDigAtTile(this.worldToTileXY(x, y));
  }

  canUndigAtTile(vector: Vector): boolean {
    const tile = this.map.getTileAt(vector.x, vector.y);
    if (!tile) return false;
    const tileKey = tile.index as TileKey;
    return TileKey.placeable(tileKey);
  }

  canUnDigAtWorldXY(x: number, y: number): boolean {
    return this.canUndigAtTile(this.worldToTileXY(x, y));
  }

  digTileAtWorldXY(x: number, y: number): Tilemaps.Tile {
    return this.digTile(this.worldToTileXY(x, y));
  }

  private digTile(xy: Vector, store = true): Tilemaps.Tile {
    if (store) {
      PersistentStore.shared().addChange(this.indexForTile(xy), Change.DELETE);
    }
    const tileType = xy.y < SKY_HEIGHT_TILES ? TileKey.BLANK : TileKey.STONE;
    this.tileCache.add(this.indexForTile(xy));
    return this.putTileAt(tileType, xy);
  }

  unDigTileAtWorldXY(x: number, y: number, type: TileKey): void {
    this.unDigTile(this.worldToTileXY(x, y), type);
  }

  private unDigTile(xy: Vector, type: TileKey, store = true): void {
    if (store) {
      PersistentStore.shared().addChange(
        this.indexForTile(xy),
        type == TileKey.STONE_WITH_MUSHROOM
          ? Change.PLACE_MUSHROOM
          : Change.PLACE_DIRT
      );
    }
    this.tileCache.add(this.indexForTile(xy));
    this.putTileAt(type, xy);
  }

  private putTileAt(tileType: TileKey, vec: Vector): Phaser.Tilemaps.Tile {
    const idx = this.indexForTile(vec);
    this.map.getTileAt(vec.x, vec.y)?.destroy();
    const tile = this.map
      .putTileAt(tileType, vec.x, vec.y)
      .setCollision(TileKey.collides(tileType));
    if (tileType == TileKey.STONE_WITH_MUSHROOM) {
      tile.setCollisionCallback(MapLoader.onMushroom, {});
    }
    return tile;
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
