import absurd from "./absurd";

export enum TileKey {
  BLANK = 53,
  GRASS = 43,
  DIRT = 52,
  SANDY_DIRT = 6,
  STONE = 68,
  BLUE = 88,
  LIGHT_STONE = 39,
}

export namespace TileKey {
  export function collides(tileKey: TileKey): boolean {
    switch (tileKey) {
      case TileKey.GRASS:
      case TileKey.DIRT:
      case TileKey.SANDY_DIRT:
      case TileKey.LIGHT_STONE:
      case TileKey.BLUE:
        return true;
      case TileKey.BLANK:
      case TileKey.STONE:
        return false;
      default:
        absurd(tileKey);
    }
    return false;
  }

  export function destructible(tileKey: TileKey): boolean {
    switch (tileKey) {
      case TileKey.GRASS:
      case TileKey.DIRT:
      case TileKey.SANDY_DIRT:
        return true;
      case TileKey.BLANK:
      case TileKey.STONE:
      case TileKey.LIGHT_STONE:
      case TileKey.BLUE:
        return false;
      default:
        absurd(tileKey);
    }
    return false;
  }

  export function placeable(tileKey: TileKey): boolean {
    switch (tileKey) {
      case TileKey.BLANK:
      case TileKey.STONE:
        return true;
      case TileKey.GRASS:
      case TileKey.DIRT:
      case TileKey.SANDY_DIRT:
      case TileKey.LIGHT_STONE:
      case TileKey.BLUE:
        return false;
      default:
        absurd(tileKey);
    }
    return false;
  }
}
