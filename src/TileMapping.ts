// Our custom tile mapping with:
// - Single index for putTileAt
// - Array of weights for weightedRandomize
// - Array or 2D array for putTilesAt
const TILE_MAPPING = {
  BLANK: 53,
  GRASS: 43,
  DIRT: [
    { index: 52, weight: 19 },
    { index: 6, weight: 1 }, // sandy version
  ],
  STONE: 68,
};

export default TILE_MAPPING;
