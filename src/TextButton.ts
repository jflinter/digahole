export default class TextButton extends Phaser.GameObjects.Text {
  constructor(scene, x, y, text, style, callback) {
    super(scene, x, y, text, style);

    this.setInteractive({ useHandCursor: true })
      .on("pointerover", () => this.enterButtonHoverState())
      .on("pointerout", () => this.enterButtonRestState())
      .on("pointerdown", () => this.enterButtonActiveState())
      .on("pointerup", () => {
        this.enterButtonHoverState();
        callback();
      });
  }

  enterButtonHoverState() {
    this.setStyle({ fontStyle: "italic" });
  }

  enterButtonRestState() {
    this.setStyle({ fontStyle: "normal" });
  }

  enterButtonActiveState() {
    this.setStyle({ fontStyle: "italic" });
  }

  innerWidth() {
    return Phaser.GameObjects.GetTextSize(this, this.getTextMetrics(), [
      this.text,
    ]).width;
  }
}
