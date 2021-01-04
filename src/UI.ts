import Phaser from "phaser";
import Controls, { CONTROL_SIZE } from "./Controls";
import eventsCenter from "./EventsCenter";

export const UIScene_Key = "ui-scene";

export default class UIScene extends Phaser.Scene {
  private label!: Phaser.GameObjects.Text;
  private controls!: Controls;

  constructor() {
    super(UIScene_Key);
  }

  create() {
    this.label = this.add.text(20, 20, "hello", {
      fontSize: "32px",
      color: "#000",
    });
    this.controls = new Controls(
      this,
      20,
      this.cameras.main.height - CONTROL_SIZE - 20
    );
    eventsCenter.on("my_hole_depth", (depth) => this.updateCount(depth.depth));
    eventsCenter.on("leaderboard", (leaderboard) =>
      console.log(JSON.stringify(leaderboard))
    );
  }

  updateCount(count: integer) {
    this.label.text = `Hole Depth: ${count}m`;
  }
}
