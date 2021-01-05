import Phaser from "phaser";
import Intro from "./Intro";
import Game from "./Game";
import UI from "./UI";
import PersistentStore from "./PersistentStore";
import MessageState from "./Messages";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#B0E9FC",
  render: {
    pixelArt: true,
    antialiasGL: false,
  },
  audio: {
    disableWebAudio: true,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: {
        y: 2000,
      },
    },
  },
};

(async () => {
  await PersistentStore.initialize();
  config.scene =
    PersistentStore.shared().getMessageState() === MessageState.Intro
      ? [Intro, Game, UI]
      : [Game, UI];
  const game = new Phaser.Game(config);
  window.addEventListener("resize", () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
  });
})();
