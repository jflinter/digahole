import Phaser from "phaser";
import _ from "lodash";

import { mobile } from "./isMobile";
import { keyType, setKey } from "./Keys";
export const CONTROL_SIZE = 300;

/**
 * A class that wraps up our 2D platforming player logic. It creates, animates and moves a sprite in
 * response to arrow keys. Call its update method from the scene's update and call its destroy
 * method when you're done with the player.
 */
export default class Controls {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    if (mobile) {
      scene.input.addPointer(2);

      // gutter width between buttons
      const GUTTER = (scene.cameras.main.width - 2 * x - 3 * CONTROL_SIZE) / 2;

      // Create a button helper
      const createBtn = (
        key: keyType,
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
            setKey(key, true);
          })
          .on("pointerup", () => {
            triangle.setFillStyle(0x5f7374);
            setKey(key, false);
          });

        const container = scene.add.container(x, y, [rectangle, triangle]);
      };

      // create player control buttons
      createBtn("left", x, y);
      createBtn("up", x + CONTROL_SIZE + GUTTER, y);
      createBtn("right", x + 2 * CONTROL_SIZE + 2 * GUTTER, y);
    } else {
      const createKey = (keyCode, prop) => {
        const key = scene.input.keyboard.addKey(keyCode);
        key
          .on(Phaser.Input.Keyboard.Events.DOWN, () => {
            setKey(prop, true);
          })
          .on(Phaser.Input.Keyboard.Events.UP, () => {
            setKey(prop, false);
          });
      };
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
      createKey(LEFT, "left");
      createKey(RIGHT, "right");
      createKey(UP, "up");
      createKey(A, "left");
      createKey(W, "up");
      createKey(D, "right");
    }
  }
}
