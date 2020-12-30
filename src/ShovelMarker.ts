import Phaser from "phaser";
import Game from "./Game";
import MapLoader from "./MapLoader";

/**
 * A class that visualizes the mouse position within a tilemap. Call its update method from the
 * scene's update and call its destroy method when you're done with it.
 */
export default class ShovelMarker {
  mapLoader: MapLoader;
  scene: Game;
  graphics: Phaser.GameObjects.Graphics;
  topGraphics: Phaser.GameObjects.Graphics;

  constructor(scene: Game, mapLoader: MapLoader) {
    this.mapLoader = mapLoader;
    this.scene = scene;

    this.graphics = scene.add.graphics();
    this.graphics.lineStyle(5, 0xffffff, 1);

    this.graphics.strokeRect(
      0,
      0,
      mapLoader.map.tileWidth,
      mapLoader.map.tileHeight
    );
    this.graphics.lineStyle(3, 0xff4f78, 1);
    this.graphics.strokeRect(
      0,
      0,
      mapLoader.map.tileWidth,
      mapLoader.map.tileHeight
    );

    this.topGraphics = scene.add.graphics();
    this.topGraphics.lineStyle(5, 0x00ff00, 1);
    this.topGraphics.strokeRect(
      0,
      0,
      mapLoader.map.tileWidth,
      mapLoader.map.tileHeight
    );
  }

  update() {
    const pointer = this.scene.input.activePointer;
    const worldPoint = pointer.positionToCamera(
      this.scene.cameras.main
    ) as Phaser.Math.Vector2;
    const pointerTileXY = this.mapLoader.worldToTileXY(
      worldPoint.x,
      worldPoint.y
    );
    this.topGraphics.visible = this.scene.canActionAtWorldXY(
      worldPoint.x,
      worldPoint.y
    );
    const snappedWorldPoint = this.mapLoader.map.tileToWorldXY(
      pointerTileXY.x,
      pointerTileXY.y
    );
    this.graphics.setPosition(snappedWorldPoint.x, snappedWorldPoint.y);
    this.topGraphics.setPosition(snappedWorldPoint.x, snappedWorldPoint.y);
  }

  destroy() {
    this.graphics.destroy();
    this.topGraphics.destroy();
  }
}
