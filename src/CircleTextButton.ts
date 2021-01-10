export default class CircleTextButton extends Phaser.GameObjects.Container {
  circle: Phaser.GameObjects.Arc;
  constructor(
    scene: Phaser.Scene,
    x: integer,
    y: integer,
    text: string,
    padding: integer,
    callback
  ) {
    const label = scene.add.text(0, 0, text, {
      color: "#B0E9FC",
      fontSize: "64px",
    });
    label.x -= label.width / 2;
    label.y -= label.height / 2;
    const edgeSize = Math.max(label.width, label.height);

    const radius = ((edgeSize + 2 * padding) * Math.sqrt(2)) / 2;
    const circle = scene.add
      .circle(0, 0, radius, 0xffffff)
      .setStrokeStyle(4, 0);
    const children = [circle, label];
    super(scene, x, y, children);
    this.circle = circle;
    this.circle
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => this.enterButtonHoverState())
      .on("pointerout", () => this.enterButtonRestState())
      .on("pointerdown", () => this.enterButtonActiveState())
      .on("pointerup", () => {
        this.enterButtonHoverState();
        callback();
      });
  }

  enterButtonHoverState() {
    this.circle.setStrokeStyle(8, 0x0000ff);
  }

  enterButtonRestState() {
    this.circle.setStrokeStyle(4, 0);
  }

  enterButtonActiveState() {
    this.circle.setStrokeStyle(8, 0);
  }
}
