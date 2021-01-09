import Phaser from "phaser";
import _ from "lodash";

import store from "./store";

const GNOME_IMAGE = "voxel_gnome";
const ITEMS_SPRITESHEET = "voxel_items";
import { getKeys } from "./Keys";

/**
 * A class that wraps up our 2D platforming player logic. It creates, animates and moves a sprite in
 * response to arrow keys. Call its update method from the scene's update and call its destroy
 * method when you're done with the player.
 */
export default class Player {
  scene: Phaser.Scene;
  sprite: Phaser.Physics.Arcade.Sprite;
  rectangle: Phaser.GameObjects.Rectangle;
  container: Phaser.GameObjects.Container;

  public static preload(scene: Phaser.Scene) {
    scene.load.image(GNOME_IMAGE, "assets/images/gnome.png");
    scene.load.atlasXML(
      ITEMS_SPRITESHEET,
      "assets/spritesheets/spritesheet_items.png",
      "assets/spritesheets/spritesheet_items.xml"
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

    this.rectangle = scene.add
      .rectangle(25, -30, 32, 32, 0x9f6c39)
      .setAngle(45)
      .setVisible(false);
    this.container = scene.add
      .container(x, y, [shovelSprite, this.rectangle])
      .setScale(0.3);
  }

  freeze() {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.moves = false;
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
    const position = new Phaser.Math.Vector2(this.sprite.x, this.sprite.y);
    const angleToMouse = Phaser.Math.RadToDeg(
      Phaser.Math.Angle.BetweenPoints(position, worldPoint)
    );

    this.container.x = this.sprite.x + 30;
    this.container.y = this.sprite.y + 20;
    this.container.setAngle(45 + angleToMouse);
    this.rectangle.setVisible(!!store.getState().player.shovelContents);
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
