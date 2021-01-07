import Phaser from "phaser";
import { Mutex } from "async-mutex";
import Controls, { CONTROL_SIZE } from "./Controls";
import eventsCenter, { HoleDepth } from "./EventsCenter";
import MessageState, { messagesFor } from "./Messages";
import PersistentStore from "./PersistentStore";
import megaPrompt from "./megaPrompt";
import TextButton from "./TextButton";

export const UIScene_Key = "ui-scene";
const AVATAR_KEY = "pixel_jack";

type Message = { type: "normal" | "prompt"; content: string; delay?: integer };

export default class UIScene extends Phaser.Scene {
  private mutex = new Mutex();
  private depthLabel!: Phaser.GameObjects.Text;
  private controls!: Controls;
  private messageLabel!: Phaser.GameObjects.Text;
  private avatar!: Phaser.GameObjects.Sprite;
  private graphics!: Phaser.GameObjects.Graphics;
  private currentMessages: [string, string] = ["", ""];
  private leaderboardButton!: TextButton;
  private leaderboard!: HoleDepth[];

  constructor() {
    super(UIScene_Key);
  }

  preload() {
    this.load.image(AVATAR_KEY, "assets/images/avatar_jack.png");
  }

  create() {
    eventsCenter.on("new_message_state", (state) => {
      const messages = messagesFor(this, state);
      this.sendMessages(messages, 2000, () => {
        if (state === MessageState.ThreeMeters) {
          const name = megaPrompt(
            "Enter your full legal name, as it appears on your drivers license or birth certificate."
          );
          PersistentStore.shared().setPlayerName(name);
        }
      });
    });
    if (PersistentStore.shared().getMessageState() === MessageState.Intro) {
      PersistentStore.shared().setMessageState(MessageState.Tutorial);
    }
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
    this.controls = new Controls(
      this,
      20,
      this.cameras.main.height - CONTROL_SIZE - 20
    );
    eventsCenter.on("my_hole_depth", (depth) => this.updateCount(depth.depth));
    eventsCenter.on(
      "leaderboard",
      (leaderboard) => (this.leaderboard = leaderboard)
    );
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
        const messages = this.leaderboard
          .map((depth) => {
            return `${depth.name} dug ${depth.depth}m`;
          })
          .join("\n");
        this.sendMessages([messages], 5000);
      }
    );
    this.add.existing(this.leaderboardButton);
  }

  async sendMessages(
    messages: string[],
    delay: integer,
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

  async sendMessage(message: string, delay: integer) {
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
      await this.wait(20);
    }
    await this.wait(delay);
    this.messageLabel.setVisible(false);
  }

  async wait(millis) {
    return new Promise((resolve) => {
      setTimeout(resolve, millis);
    });
  }

  updateCount(count: integer) {
    this.depthLabel.text = `Hole Depth: ${count}m`;
  }
}
