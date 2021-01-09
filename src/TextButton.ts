export default class TextButton extends Phaser.GameObjects.Text {
  private italicize: boolean;
  constructor(scene, x, y, text, style, callback, italicize = false) {
    super(scene, x, y, text, style);
    this.italicize = italicize;

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
    if (this.italicize) {
      this.setStyle({ fontStyle: "italic" });
    }
  }

  enterButtonRestState() {
    if (this.italicize) {
      this.setStyle({ fontStyle: "normal" });
    }
  }

  enterButtonActiveState() {
    if (this.italicize) {
      this.setStyle({ fontStyle: "italic" });
    }
  }

  innerWidth() {
    return Phaser.GameObjects.GetTextSize(this, this.getTextMetrics(), [
      this.text,
    ]).width;
  }
}
