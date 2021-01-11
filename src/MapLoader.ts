import Phaser, { Tilemaps } from "phaser";
import _ from "lodash";

import { TileKey } from "./TileKey";
import TileChooser from "./TileChooser";
import store, {
  addChange,
  hasTouchedMushroom,
  setBlueTilePoint,
  setOrangeTilePoint,
} from "./store";

export const TILE_SIZE = 128;
const SKY_HEIGHT_TILES = 4;

const TILE_SPRITESHEET = "voxel_tiles";

type Vector = Phaser.Math.Vector2;
const Vector = Phaser.Math.Vector2;

export default class MapLoader {
  private scene: Phaser.Scene;
  width: integer;
  height: integer;
  map: Phaser.Tilemaps.Tilemap;
  layer: Tilemaps.TilemapLayer;
  private tileChooser: TileChooser;

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

  constructor(scene: Phaser.Scene, width: integer, height: integer) {
    this.scene = scene;
    this.width = width;
    this.height = height;
    const widthInTiles = Math.round(width / TILE_SIZE);
    const heightInTiles = Math.round(width / TILE_SIZE);
    this.tileChooser = new TileChooser(widthInTiles, heightInTiles);

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
      .setCollisionByExclusion([TileKey.BLUE, TileKey.BLANK, TileKey.STONE]);
    const tiles = this.map.getTilesWithin();
    _.range(0, tiles.length).forEach((i) => {
      this.createTile(i);
    });
    let changes = store.getState().changes;
    changes.forEach(([idx, tileType]) => {
      if (tileType) {
        this.unDigTile(this.tileXYFromIndex(idx), tileType, false);
      } else {
        this.digTile(this.tileXYFromIndex(idx), false);
      }
    });
  }

  private indexForTile(vec: Vector): integer {
    return vec.x + this.map.width * vec.y;
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
    const points: [number, number][] = this.map
      .filterTiles((t) =>
        [TileKey.STONE, TileKey.PORTAL_ORANGE, TileKey.PORTAL_BLUE].includes(
          t.index
        )
      )
      .map((t) => [t.x, t.y]);
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
        store.dispatch(hasTouchedMushroom());
        sprite.setVelocityY(-1500);
        collisionTile.tilemap.scene.cameras.main.shake(70, 0.02);
        return true;
      }
    }
    return false;
  }

  private createTile(idx): Phaser.Tilemaps.Tile {
    const xy = this.tileXYFromIndex(idx);
    const tileType = this.tileChooser.tileAt(xy.x, xy.y);
    const tile = this.putTileAt(tileType, xy);
    return tile;
  }

  getTileAtWorldXY(x: number, y: number): Phaser.Tilemaps.Tile {
    return this.map.getTileAtWorldXY(x, y);
  }

  getTileAtTileXY(xy: Vector): Phaser.Tilemaps.Tile {
    return this.map.getTileAt(xy.x, xy.y);
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

  private digTile(xy: Vector, shouldStore = true): Tilemaps.Tile {
    if (shouldStore) {
      store.dispatch(addChange([this.indexForTile(xy), null]));
    }
    const tileType = xy.y < SKY_HEIGHT_TILES ? TileKey.BLANK : TileKey.STONE;
    return this.putTileAt(tileType, xy);
  }

  unDigTileAtWorldXY(x: number, y: number, type: TileKey): void {
    this.unDigTile(this.worldToTileXY(x, y), type);
  }

  private unDigTile(xy: Vector, type: TileKey, shouldStore = true): void {
    if (shouldStore) {
      store.dispatch(addChange([this.indexForTile(xy), type]));
    }
    this.putTileAt(type, xy);
  }

  private putTileAt(tileType: TileKey, vec: Vector): Phaser.Tilemaps.Tile {
    const idx = this.indexForTile(vec);
    if (tileType == TileKey.PORTAL_BLUE || tileType == TileKey.PORTAL_ORANGE) {
      const actionCreator =
        tileType == TileKey.PORTAL_BLUE ? setBlueTilePoint : setOrangeTilePoint;
      const point = this.map.tileToWorldXY(vec.x, vec.y);
      store.dispatch(
        actionCreator([point.x + TILE_SIZE / 2, point.y + TILE_SIZE / 2])
      );
    }
    this.map.getTileAt(vec.x, vec.y)?.destroy();
    const tile = this.map
      .putTileAt(tileType, vec.x, vec.y)
      .setCollision(TileKey.collides(tileType));
    if (tileType == TileKey.STONE_WITH_MUSHROOM) {
      tile.setCollisionCallback(MapLoader.onMushroom, {});
    }
    return tile;
  }

  placeInitialOrangeTile() {
    const y1 = SKY_HEIGHT_TILES;
    const y2 = y1 + 1;
    const y3 = y2 + 1;
    [
      [1, y1],
      [2, y1],
      [3, y1],
      [4, y1],
      [5, y1],
      [6, y1],
      [7, y1],
      [2, y2],
      [3, y2],
      [4, y2],
      [5, y2],
      [6, y2],
      [3, y3],
      [4, y3],
      [5, y3],
    ].map((p) => this.digTile(new Phaser.Math.Vector2(p[0], p[1])));
    // will implicitly set the tile point
    this.unDigTile(new Phaser.Math.Vector2(4, y3), TileKey.PORTAL_ORANGE);
  }

  worldToTileXY(x: number, y: number): Vector {
    const xy = this.map.worldToTileXY(x, y);
    return new Vector(xy.x, xy.y);
  }

  private tileXYFromIndex(idx: integer): Vector {
    return new Vector(idx % this.map.width, Math.floor(idx / this.map.width));
  }

  destroy() {}
}
