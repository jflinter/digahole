import Phaser from "phaser";

export default function isMobile(scene: Phaser.Scene): boolean {
  return scene.sys.game.device.input.touch;
}
