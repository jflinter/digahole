import Phaser from "phaser";
import _ from "lodash";

import eventsCenter from "./EventsCenter";

export type Key = { isDown: boolean };
export type Keys = {
  left: Key;
  right: Key;
  up: Key;
  down: Key;
  w: Key;
  a: Key;
  s: Key;
  d: Key;
};

export const CONTROL_SIZE = 300;

/**
 * A class that wraps up our 2D platforming player logic. It creates, animates and moves a sprite in
 * response to arrow keys. Call its update method from the scene's update and call its destroy
 * method when you're done with the player.
 */
export default class Controls {
  public keys: Keys;
  public isMobile: boolean;
  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.isMobile = scene.sys.game.device.input.touch;
    if (this.isMobile) {
      this.keys = {
        left: { isDown: false },
        right: { isDown: false },
        up: { isDown: false },
        down: { isDown: false },
        w: { isDown: false },
        a: { isDown: false },
        s: { isDown: false },
        d: { isDown: false },
      };

      scene.input.addPointer(2);

      // gutter width between buttons
      const GUTTER = (scene.cameras.main.width - 2 * x - 3 * CONTROL_SIZE) / 2;

      // Create a button helper
      const createBtn = (
        key,
        x,
        y,
        width = CONTROL_SIZE,
        height = CONTROL_SIZE
      ) => {
        // Add a faded out red rectangle for our button
        const rectangle = scene.add
          .rectangle(0, 0, width, height, 0xeeedec, 0.7)
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setStrokeStyle(4, 0x5c7071)
          .setInteractive();
        const t = Phaser.Geom.Triangle.BuildEquilateral(width / 2, 0, width);
        const triangle = scene.add
          .triangle(
            width / 2,
            height / 2,
            t.x1,
            t.y1,
            t.x2,
            t.y2,
            t.x3,
            t.y3,
            0x5f7374
          )
          .setStrokeStyle(4, 0x5b6e6f)
          .setScrollFactor(0)
          .setAngle({ left: -90, up: 0, right: 90 }[key])
          .setScale(0.75);
        rectangle
          .on("pointerdown", () => {
            triangle.setFillStyle(0x000000);
            this.keys[key].isDown = true;
            this.updateKeys();
          })
          .on("pointerup", () => {
            triangle.setFillStyle(0x5f7374);
            this.keys[key].isDown = false;
            this.updateKeys();
          });

        const container = scene.add.container(x, y, [rectangle, triangle]);
      };

      // create player control buttons
      createBtn("left", x, y);
      createBtn("up", x + CONTROL_SIZE + GUTTER, y);
      createBtn("right", x + 2 * CONTROL_SIZE + 2 * GUTTER, y);
    } else {
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
      }) as Keys;
      scene.input.keyboard.on("keydown", this.updateKeys, this);
      scene.input.keyboard.on("keyup", this.updateKeys, this);
    }
  }

  updateKeys() {
    eventsCenter.emit("keyboard", this.keys);
  }
}
