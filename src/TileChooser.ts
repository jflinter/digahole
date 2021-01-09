import absurd from "./absurd";
import { TileKey } from "./TileKey";
import PersistentStore from "./PersistentStore";
import Chance from "chance";
import _ from "lodash";
import store from "./store";

class SpecialArea {
  x: integer;
  y: integer;
  maxX: integer;
  maxY: integer;
  tiles: TileKey[][];

  constructor(x: integer, y: integer, tiles: TileKey[][]) {
    this.x = x;
    this.y = y;
    this.maxX = x + tiles[0].length;
    this.maxY = y + tiles.length;
    this.tiles = tiles;
  }

  static squareEmpty(x, y, size): SpecialArea {
    return new SpecialArea(
      x,
      y,
      Array(size).fill(Array(size).fill(TileKey.STONE))
    );
  }

  contains(x, y): boolean {
    return this.x <= x && this.maxX > x && this.y <= y && this.maxY > y;
  }

  tileAt(x, y): TileKey {
    const row = this.tiles[y - this.y];
    return row[x - this.x];
  }
}

const SKY_HEIGHT_TILES = 4;
const SHALLOW_DIRT_DEPTH = SKY_HEIGHT_TILES + 4;

export default class TileChooser {
  private width: integer;
  private height: integer;
  private randomDirt: integer[];
  private shallowDirt: integer[];
  private chance = new Chance(store.getState().randomSeed);
  private specialAreas: SpecialArea[];

  // hack: generate a large array to prevent repeats in the tile array
  // there is definitely a better way to do this
  constructor(width: integer, height: integer) {
    this.width = width;
    this.height = height;
    this.randomDirt = this.chance.shuffle([
      ...Array(700).fill(TileKey.DIRT),
      ...Array(200).fill(TileKey.SANDY_DIRT),
      ...Array(130).fill(TileKey.LIGHT_STONE),
      ...Array(40).fill(TileKey.STONE_WITH_MUSHROOM),
      ...Array(20).fill(TileKey.STONE),
    ]);
    this.shallowDirt = this.chance.shuffle([
      ...Array(700).fill(TileKey.DIRT),
      ...Array(200).fill(TileKey.SANDY_DIRT),
    ]);
    this.specialAreas = [
      new SpecialArea(this.width / 2 + 2, SHALLOW_DIRT_DEPTH - 1, [
        [TileKey.STONE_WITH_MUSHROOM],
      ]),
      new SpecialArea(this.width / 2 + 1, SHALLOW_DIRT_DEPTH + 3, [
        [TileKey.STONE, TileKey.STONE, TileKey.DIRT],
        [TileKey.STONE, TileKey.STONE, TileKey.STONE_WITH_MUSHROOM],
      ]),
      SpecialArea.squareEmpty(this.width / 2 - 3, SHALLOW_DIRT_DEPTH + 6, 3),
    ];
  }

  tileAt(x: integer, y: integer): TileKey {
    const special = _.find(this.specialAreas, (a) => a.contains(x, y));
    if (special) {
      return special.tileAt(x, y);
    }
    if (y < SKY_HEIGHT_TILES) {
      return TileKey.BLANK;
    } else if (y === SKY_HEIGHT_TILES) {
      return TileKey.GRASS;
    } else if (y < SHALLOW_DIRT_DEPTH) {
      return this.shallowDirt[this.index(x, y) % this.shallowDirt.length];
    } else {
      return this.randomDirt[this.index(x, y) % this.randomDirt.length];
    }
  }

  private index(x, y) {
    return x + this.width * y;
  }
}
