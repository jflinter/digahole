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
