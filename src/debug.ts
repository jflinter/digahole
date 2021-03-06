import { DB } from "./Firebase";
import Game from "./Game";
import store, {
  setName,
  setOrangeTilePoint,
  LeaderboardEntry,
  removeAchievement,
} from "./store";
import UIScene from "./UI";
import { reset } from "./Persistence";
import { AchievementType } from "./Achievements";
import megaPrompt from "./megaPrompt";

export const initializeDebug = () => {
  (window as any).debug = {
    get store() {
      return store;
    },
    removeAchievement: (achievement: AchievementType) => {
      store.dispatch(removeAchievement(achievement));
      return (window as any).debug;
    },
    setPlayerName: (name) => {
      store.dispatch(setName(name));
      return (window as any).debug;
    },
    reset: () => {
      reset().then(() => window.location.reload());
    },
    warpTo: (x, y) => {
      Game.instance.warpTo(x, y);
      return (window as any).debug;
    },
    resetOrangeTile: () => {
      const point = store.getState().player.orangeTilePoint;
      if (point) {
        Game.instance.mapLoader.digTileAtWorldXY(point[0], point[1]);
        store.dispatch(setOrangeTilePoint(null));
      }
      return (window as any).debug;
    },
    sendDebugMessages: (messages, cpms, minDuration) => {
      UIScene.instance.sendDebugMessages(messages, cpms, minDuration);
      return (window as any).debug;
    },
    disableShovelContents: () => {
      Game.instance.shovelContentsEnabled = false;
      return (window as any).debug;
    },
    testPrompt: () => {
      let i = 0;
      megaPrompt(
        "Please enter your shipping address.",
        () => {
          const errors = [
            "Invalid ZIP - please enter your address plus full 9 digit ZIP.",
            "Invalid, uh, capitalization. Please try again in all UPPERCASE.",
            "OK look I was lying about the sweatshirts, this thing just errors until you hit cancel.",
            "Invalid address.",
          ];
          const error = i < errors.length ? errors[i++] : errors[3];
          return `${error} Please enter your shipping address or hit cancel if you don't want a sweatshirt after all.`;
        },
        (val) => !val
      );
    },
    prepopulateFirebase: () => {
      ["development", "staging", "production"].forEach((env) => {
        const table = "user_depths_" + env;
        const users: [string, number, string][] = [
          ["Stanley Yelnats", 35, "stanley"],
          ["my beautiful cat Zoë", 20, "zoe"],
          ["Phoebe Bridgers", 15, "phoebe"],
          ["George Clooney", 10, "clooney"],
        ];
        users.forEach((user) => {
          const id = `preloaded_${user[2]}`;
          const entry: LeaderboardEntry = {
            randomSeed: id,
            name: user[0],
            depth: user[1],
            hasWon: false,
            created: Date.now(),
          };
          DB.collection(table).doc(id).set(entry);
        });
      });
      return (window as any).debug;
    },
  };
};
