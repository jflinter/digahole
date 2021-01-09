import Phaser from "phaser";
import Intro from "./Intro";
import Game from "./Game";
import UI from "./UI";
import { initializeDebug } from "./debug";
import { initializeFirebase } from "./Firebase";
import store from "./store";

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
  initializeDebug();
  initializeFirebase();
  config.scene = store.getState().achievements.includes("intro")
    ? [Game, UI]
    : [Intro, Game, UI];
  const game = new Phaser.Game(config);
  window.addEventListener("resize", () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
  });
})();
