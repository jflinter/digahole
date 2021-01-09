import Phaser from "phaser";
import { Mutex } from "async-mutex";
import { map } from "rxjs/operators";

import Controls, { CONTROL_SIZE } from "./Controls";
import TextButton from "./TextButton";
import store, { addAchievement, getState$, RootState } from "./store";
import { afterEarning, earnedAchievement, messagesFor } from "./Achievements";
import { adjectives, greatAdjectives, holeNouns } from "./Words";
import { Chance } from "chance";

export const UIScene_Key = "ui-scene";
const AVATAR_KEY = "pixel_jack";

const DEFAULT_NAME = "Agnomenymous";

type delay = { char: integer; line: integer };

export default class UIScene extends Phaser.Scene {
  private mutex = new Mutex();
  private depthLabel!: Phaser.GameObjects.Text;
  private messageLabel!: Phaser.GameObjects.Text;
  private avatar!: Phaser.GameObjects.Sprite;
  private graphics!: Phaser.GameObjects.Graphics;
  private currentMessages: [string, string] = ["", ""];
  private leaderboardButton!: TextButton;

  constructor() {
    super(UIScene_Key);
  }

  preload() {
    this.load.image(AVATAR_KEY, "assets/images/avatar_jack.png");
  }

  create() {
    this.leaderboardButton = new TextButton(
      this,
      this.cameras.main.width - 100,
      40,
      "👑",
      {
        color: "#B0E9FC",
        fontSize: "64px",
      },
      () => {
        const messages = buildLeaderboard(store.getState());
        this.sendMessages([messages], { char: 5, line: 15000 });
      }
    ).setVisible(false);
    this.add.existing(this.leaderboardButton);
    this.graphics = this.add.graphics({ x: 180, y: 30 }).setVisible(false);
    this.depthLabel = this.add.text(20, 20, "", {
      fontSize: "32px",
      color: "#000",
    });
    this.messageLabel = this.add
      .text(180, 30, "", {
        fontSize: "32px",
        color: "#000",
      })
      .setVisible(false)
      .setPadding(20)
      .setWordWrapWidth(this.cameras.main.width - 250);
    this.avatar = this.add
      .sprite(90, 100, AVATAR_KEY)
      .setScale(2, 2)
      .setVisible(false);
    new Controls(this, 20, this.cameras.main.height - CONTROL_SIZE - 20);

    getState$()
      .pipe(map(earnedAchievement))
      .subscribe((achievement) => {
        if (achievement) {
          store.dispatch(addAchievement(achievement));
          const state = store.getState();
          const messages = messagesFor(achievement, state);
          const after = afterEarning(achievement);
          this.sendMessages(messages, { char: 20, line: 6000 }, after);
        }
      });
  }

  update() {
    const state = store.getState();
    const text = `Hole Depth: ${state.holeDepth.current}m`;
    if (this.depthLabel.text !== text) {
      this.depthLabel.text = text;
    }
    this.leaderboardButton.setVisible(
      this.depthLabel.visible && state.achievements.includes("leaderboard")
    );
  }

  async sendMessages(
    messages: string[],
    delay: delay,
    callback: () => void = () => {}
  ) {
    if (messages.length === 0) {
      callback();
      return;
    }
    const release = await this.mutex.acquire();
    this.currentMessages = ["", ""];
    this.depthLabel.setVisible(false);
    this.graphics.setVisible(true);
    this.avatar.setVisible(true);
    for (const message of messages) {
      await this.sendMessage(message, delay);
    }
    this.avatar.setVisible(false);
    this.depthLabel.setVisible(true);
    this.graphics.setVisible(false);
    this.currentMessages = ["", ""];
    callback();
    release();
  }

  async sendMessage(message: string, delay: delay) {
    message = this.messageLabel.getWrappedText(message).join("\n");
    // const lastLine =
    // this.currentMessages[1] === "" ? "" : `${this.currentMessages[1]}\n`;
    const lastLine = ""; // Switch comments to enable message buffering
    this.currentMessages = [lastLine, message];
    this.graphics.clear();
    const size = Phaser.GameObjects.GetTextSize(
      this.messageLabel,
      this.messageLabel.getTextMetrics(),
      this.currentMessages.join().split("\n")
    );
    const width =
      size.width +
      (this.messageLabel.padding.left || 0) +
      (this.messageLabel.padding.right || 0);
    const height =
      size.height +
      (this.messageLabel.padding.top || 0) +
      (this.messageLabel.padding.bottom || 0);
    this.graphics.fillStyle(0xffffff);
    this.graphics.fillRoundedRect(0, 0, width, height, 30);
    this.graphics.lineStyle(4, 0x000000);
    this.graphics.strokeRoundedRect(0, 0, width, height, 30);
    this.messageLabel
      .setFixedSize(width, height)
      .setText(lastLine)
      .setVisible(true);
    for (let c of message) {
      this.messageLabel.text += c;
      await this.wait(delay.char);
    }
    await this.wait(delay.line);
    this.messageLabel.setVisible(false);
  }

  async wait(millis: integer) {
    return new Promise((resolve) => {
      setTimeout(resolve, millis);
    });
  }
}

const buildLeaderboard = (state: RootState): string => {
  const chance = new Chance();
  const entries = state.leaderboard;
  const randomSeed = state.randomSeed;
  const conclusions = [
    "Keep digging!",
    "Back to digging!",
    "Onwards!",
    "Downwards!",
    "Don't give up!",
    "Enough chit-chat, time to dig.",
  ];
  const filtered = entries
    .filter(
      (entry) => entry.depth && (entry.name || entry.randomSeed === randomSeed)
    )
    .sort((a, b) => b.depth - a.depth || a.created - b.created);
  const adjChoices = chance.pickset(adjectives, filtered.length);
  const nounChoices = chance.pickset(holeNouns, filtered.length);
  const lines = filtered.map((entry, i) => {
    const name = entry.hasWon ? `${entry.name} 😎` : entry.name;
    if (i === 0) {
      if (entry.randomSeed === randomSeed) {
        return `You, yes YOU, have the DEEPEST HOLE IN THE WORLD at ${entry.depth}m.`;
      } else {
        const great = chance.pickone(greatAdjectives);
        const an = /^[aeiou].*/i.test(great) ? "an" : "a";
        return `${name} has the deepest hole in the world - ${an} ${great} ${entry.depth}m deep.`;
      }
    }
    const then = i === 1 ? "Next" : "Then";
    const adjective = adjChoices[i];
    const noun = nounChoices[i];
    let an: string;
    if (entry.randomSeed === randomSeed) {
      an = "your";
    } else if (/^[aeiou].*/i.test(adjective)) {
      an = "an";
    } else {
      an = "a";
    }
    if (entry.randomSeed === randomSeed) {
      return `Then you!! (aka ${name}) at #${i + 1} with your ${
        entry.depth
      }m hole.`;
    } else {
      return `At #${i + 1} is ${name} and their ${adjective} ${
        entry.depth
      }m ${noun}.`;
    }
  });
  const edited = lines.join("\n");
  const conclusion = chance.pickone(conclusions);
  return `🕳️ HOLES OF FAME 🕳️\n\n${edited}\n\n${conclusion}`;
};
