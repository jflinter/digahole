import Phaser from "phaser";

import Game from "./Game";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#B0E9FC",
  scene: [Game],
  audio: {
    disableWebAudio: true,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: {
        y: 1000,
      },
    },
  },
};

const game = new Phaser.Game(config);
window.addEventListener("resize", () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
export default game;
