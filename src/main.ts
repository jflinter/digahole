import Phaser from "phaser";

import Game from "./Game";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 480,
  height: 640,
  scene: [Game],
  physics: {
    default: "arcade",
    arcade: {
      gravity: {
        y: 200,
      },
      debug: true,
    },
  },
};

export default new Phaser.Game(config);
