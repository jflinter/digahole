import Phaser from "phaser";
import _ from "lodash";

import store from "./store";
import { getKeys } from "./Keys";

const GNOME_IMAGE = "voxel_gnome";
const ITEMS_SPRITESHEET = "voxel_items";
const TILES_SPRITESHEET = "voxel_shovel_contents_tiles";

/**
 * A class that wraps up our 2D platforming player logic. It creates, animates and moves a sprite in
 * response to arrow keys. Call its update method from the scene's update and call its destroy
 * method when you're done with the player.
 */
export default class Player {
  scene: Phaser.Scene;
  sprite: Phaser.Physics.Arcade.Sprite;
  shovelContentsSprite: Phaser.GameObjects.Sprite;
  container: Phaser.GameObjects.Container;

  public static preload(scene: Phaser.Scene) {
    scene.load.image(GNOME_IMAGE, "assets/images/gnome.png");
    scene.load.atlasXML(
      ITEMS_SPRITESHEET,
      "assets/spritesheets/spritesheet_items.png",
      "assets/spritesheets/spritesheet_items.xml"
    );
    scene.load.spritesheet(
      TILES_SPRITESHEET,
      "assets/images/spritesheet_tiles_extruded.png",
      {
        frameWidth: 128,
        frameHeight: 128,
        margin: 1,
        spacing: 2,
      }
    );
  }

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;

    this.sprite = scene.physics.add
      .sprite(x, y, GNOME_IMAGE)
      .setScale(0.6)
      .setDrag(7000, 0)
      .setMaxVelocity(1000, 1700);

    const shovelSprite = scene.add.sprite(
      0,
      0,
      ITEMS_SPRITESHEET,
      "shovel_iron.png"
    );

    this.shovelContentsSprite = scene.add
      .sprite(25, -30, TILES_SPRITESHEET)
      .setFrame(0)
      .setAngle(45)
      .setScale(0.4)
      .setVisible(false);
    this.container = scene.add
      .container(x, y, [shovelSprite, this.shovelContentsSprite])
      .setScale(0.3);
  }

  update() {
    const keys = getKeys();
    const onGround = this.sprite.body.blocked.down;
    const acceleration = 3000;

    // Apply horizontal acceleration when left/a or right/d are applied
    if (keys.left) {
      this.sprite.setAccelerationX(-acceleration);
      this.flip(true);
    } else if (keys.right) {
      this.sprite.setAccelerationX(acceleration);
      this.flip(false);
    } else {
      this.sprite.setAccelerationX(0);
    }

    // Only allow the player to jump if they are on the ground
    if (onGround && keys.up) {
      this.jump();
    }

    const pointer = this.scene.input.activePointer;
    const worldPoint = pointer.positionToCamera(
      this.scene.cameras.main
    ) as Phaser.Math.Vector2;
    const achievements = store.getState().achievements;
    const portalPoint = store.getState().player.blueTilePoint;
    const compass =
      achievements.includes("portal_hint") &&
      !achievements.includes("portal_touch");
    const pointTo =
      compass && portalPoint
        ? new Phaser.Math.Vector2(portalPoint[0], portalPoint[1])
        : worldPoint;
    const position = new Phaser.Math.Vector2(this.sprite.x, this.sprite.y);
    const angleToMouse = Phaser.Math.RadToDeg(
      Phaser.Math.Angle.BetweenPoints(position, pointTo)
    );

    this.container.x = this.sprite.x + 30;
    this.container.y = this.sprite.y + 20;
    this.container.setAngle(45 + angleToMouse);
    const { shovelContents } = store.getState().player;
    this.shovelContentsSprite
      .setVisible(!!shovelContents)
      .setFrame(shovelContents || 0);
  }

  jump() {
    this.sprite.setVelocityY(-800);
  }

  private flip(flipped) {
    this.sprite.setFlipX(flipped);
  }

  destroy() {
    this.sprite.destroy();
  }
}
