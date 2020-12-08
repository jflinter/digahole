import Phaser from "phaser";
import _ from "lodash";

import Game from "./Game";

/**
 * A class that wraps up our 2D platforming player logic. It creates, animates and moves a sprite in
 * response to arrow keys. Call its update method from the scene's update and call its destroy
 * method when you're done with the player.
 */
export default class Player {
  scene: Phaser.Scene;
  sprite: Phaser.Physics.Arcade.Sprite;
  // container: Phaser.GameObjects.Container;
  keys: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    w: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    s: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
  };
  debugGraphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.debugGraphics = scene.add.graphics();

    this.sprite = scene.physics.add.sprite(x, y, Game.GNOME_IMAGE);

    this.sprite.setScale(0.8).setDrag(5000, 0).setMaxVelocity(1000, 2000);

    // Track the arrow keys
    const {
      LEFT,
      RIGHT,
      UP,
      DOWN,
      W,
      A,
      S,
      D,
    } = Phaser.Input.Keyboard.KeyCodes;
    this.keys = scene.input.keyboard.addKeys({
      left: LEFT,
      right: RIGHT,
      up: UP,
      down: DOWN,
      w: W,
      a: A,
      s: S,
      d: D,
    }) as any;
  }

  freeze() {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.moves = false;
  }

  oldX;
  oldY;
  update() {
    const { keys, sprite } = this;

    // // temporary logic to make debugging easier
    // if (keys.left.isDown) {
    //   sprite.setVelocityX(-1000);
    // } else if (keys.right.isDown) {
    //   sprite.setVelocityX(1000);
    // } else if (keys.down.isDown) {
    //   sprite.setVelocityY(1000);
    // } else if (keys.up.isDown) {
    //   sprite.setVelocityY(-1000);
    // } else {
    //   sprite.setVelocityX(0);
    //   sprite.setVelocityY(0);
    // }
    // if (this.oldX != sprite.x) {
    //   this.oldX = sprite.x;
    //   this.oldY = sprite.y;
    //   _.throttle(() => console.log(sprite.x, sprite.y), 500);
    // }
    // return;

    const onGround = this.sprite.body.blocked.down;
    const acceleration = 3000;

    // Apply horizontal acceleration when left/a or right/d are applied
    if (keys.left.isDown || keys.a.isDown) {
      this.sprite.setAccelerationX(-acceleration);
      this.flip(true);
    } else if (keys.right.isDown || keys.d.isDown) {
      this.sprite.setAccelerationX(acceleration);
      this.flip(false);
    } else {
      this.sprite.setAccelerationX(0);
    }

    // Only allow the player to jump if they are on the ground
    if (onGround && (keys.up.isDown || keys.w.isDown)) {
      this.jump();
    }
  }

  jump() {
    this.sprite.setVelocityY(-750);
  }

  private flip(flipped) {
    this.sprite.setFlipX(flipped);
  }

  destroy() {
    this.sprite.destroy();
  }
}
