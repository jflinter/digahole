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
  };
  debugGraphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;

    // Create the animations we need from the player spritesheet
    const anims = scene.anims;
    // anims.create({
    //   key: "player-idle",
    //   frames: anims.generateFrameNumbers("player", { start: 0, end: 3 }),
    //   frameRate: 3,
    //   repeat: -1,
    // });
    // anims.create({
    //   key: "player-run",
    //   frames: anims.generateFrameNumbers("player", { start: 8, end: 15 }),
    //   frameRate: 12,
    //   repeat: -1,
    // });

    // Create the physics-based sprite that we will move around and animate

    this.debugGraphics = scene.add.graphics();

    this.sprite = scene.physics.add.sprite(x, y, Game.GNOME_IMAGE);

    // const head = scene.add.image(
    //   0,
    //   0,
    //   Game.PLAYER_SPRITESHEET,
    //   "gnome_head.png"
    // );
    // const body = scene.add.image(
    //   0,
    //   42,
    //   Game.PLAYER_SPRITESHEET,
    //   "gnome_body.png"
    // );
    // const leg = scene.add.image(
    //   0,
    //   58,
    //   Game.PLAYER_SPRITESHEET,
    //   "gnome_leg.png"
    // );
    // const arm = scene.add.image(
    //   14,
    //   45,
    //   Game.PLAYER_SPRITESHEET,
    //   "gnome_arm.png"
    // );
    // const shovel = scene.add
    //   .image(-3, 42, Game.ITEM_SPRITESHEET, "shovel_iron.png")
    //   .setScale(-0.5, 0.5); // shovel is flipped

    // this.container = scene.add.container(x, y, [leg, body, head, shovel, arm]);

    // //  A Container has a default size of 0x0, so we need to give it a size before enabling a physics
    // //  body or it'll be given the default body size of 64x64.
    // this.container.setSize(42, 120);

    // scene.physics.world.enable(this.container);

    this.sprite.setScale(0.8).setDrag(1000, 0).setMaxVelocity(1000, 2000);

    // Track the arrow keys
    const { LEFT, RIGHT, UP, DOWN } = Phaser.Input.Keyboard.KeyCodes;
    this.keys = scene.input.keyboard.addKeys({
      left: LEFT,
      right: RIGHT,
      up: UP,
      down: DOWN,
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
    const acceleration = onGround ? 1200 : 900;

    // Apply horizontal acceleration when left/a or right/d are applied
    if (keys.left.isDown) {
      this.sprite.setAccelerationX(-acceleration);
      this.flip(true);
    } else if (keys.right.isDown) {
      this.sprite.setAccelerationX(acceleration);
      this.flip(false);
    } else {
      this.sprite.setAccelerationX(0);
    }

    // Only allow the player to jump if they are on the ground
    if (onGround && keys.up.isDown) {
      this.sprite.setVelocityY(-600);
    }

    // Update the animation/texture based on the state of the player
    // if (onGround) {
    //   if (sprite.body.velocity.x !== 0) sprite.anims.play("player-run", true);
    //   else sprite.anims.play("player-idle", true);
    // } else {
    //   sprite.anims.stop();
    //   sprite.setTexture("player", 10);
    // }

    // this.sprite.body.drawDebug(this.debugGraphics);
  }

  flip(flipped) {
    this.sprite.setFlipX(flipped);
  }

  destroy() {
    this.sprite.destroy();
  }
}
