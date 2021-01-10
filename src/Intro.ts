import Phaser from "phaser";
import _ from "lodash";
import { mobile } from "./isMobile";
import TextButton from "./TextButton";
import { GAMESCENE_KEY } from "./Game";
import store, { addAchievement } from "./store";

export const IntroScene_Key = "intro-scene";

const INTRO_TEXT =
  "A single desire consumes your thoughts:\nyou yearn to hear the clang of your shovel upon the soil,\nto feel the damp aroma of dirt in your nostrils,\nto peer into the darkness that lies below and within,\nto toil valiantly against the infinity of the earth,\nto\n*DIG\n*A\n*H*O*O*O*O*O*O*O*O*OL*L*E*E*E*E*E*E*E*E*E*E*E*E*E*E*E*E*E*E*E*!*!*!*!";

export default class UIScene extends Phaser.Scene {
  private label!: Phaser.GameObjects.Text;

  constructor() {
    super(IntroScene_Key);
  }

  incr(text: string, i: integer, callback: () => void) {
    if (i >= text.length) {
      callback();
      return;
    }
    let delay: number;
    const c = text[i];
    if (c === "*") {
      this.cameras.main.shake();
      delay = 40;
    } else if (c === "\n") {
      delay = 1300;
      this.label.text += text[i];
    } else if (c === "~") {
      delay = 30;
      this.label.text += "\n";
    } else {
      delay = 30;
      this.label.text += text[i];
    }
    this.time.addEvent({
      callback: () => {
        this.incr(text, i + 1, callback);
      },
      delay: delay,
    });
  }

  create() {
    const camera = this.cameras.main;
    camera.setBackgroundColor("#000");
    const offset = mobile ? 10 : 160;
    this.label = this.add
      .text(20, 20, "", {
        fontSize: "32px",
        color: "#fff",
        align: "left",
        fontStyle: "",
      })
      .setFixedSize(camera.width, camera.height)
      .setWordWrapWidth(camera.width - 2 * offset);

    const text = INTRO_TEXT.split("\n")
      .map((line) => {
        const sublines = this.label.getWrappedText(line);
        return sublines.join("~");
      })
      .join("\n");
    const height = Phaser.GameObjects.GetTextSize(
      this.label,
      this.label.getTextMetrics(),
      text.replace(/~/g, "\n").split("\n")
    ).height;
    const button = new TextButton(
      this,
      0,
      height + 70,
      "✨BEGIN✨",
      {
        color: "#B0E9FC",
        fontSize: "64px",
      },
      () => {
        store.dispatch(addAchievement("intro"));
        this.scene.start(GAMESCENE_KEY);
      },
      true
    );
    button.setX(camera.width / 2 - button.innerWidth() / 2);
    this.incr(text, 0, () => {
      this.time.addEvent({
        callback: () => {
          this.add.existing(button);
        },
        delay: 500,
      });
    });
  }
}
