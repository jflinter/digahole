import Phaser from "phaser";
import { preload, getPeristed } from "./Persistence";
import { mobile } from "./isMobile";

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
      tileBias: 128,
      gravity: {
        y: 2000,
      },
    },
  },
};

(async () => {
  await preload();
  const val = getPeristed();
  console.log(`preloaded: ${val}`);

  // Note: we cannot import `store` (or anything that in turn imports it)
  // until we have called `await preload()`, hence the async imports here.
  const { initializeDebug } = await import("./debug");
  const { initializeFirebase } = await import("./Firebase");
  initializeDebug();
  initializeFirebase();
  const store = (await import("./store")).default;
  const Intro = (await import("./Intro")).default;
  const Game = (await import("./Game")).default;
  const UI = (await import("./UI")).default;
  config.scene = store.getState().achievements.includes("intro")
    ? [Game, UI]
    : [Intro, Game, UI];
  const game = new Phaser.Game(config);
  game.scale.resize(window.innerWidth, window.innerHeight);
  if (mobile) {
    window.addEventListener("resize", () => {
      game.scale.resize(window.innerWidth, window.innerHeight);
    });
  }
})();
