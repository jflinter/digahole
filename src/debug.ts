import Game from "./Game";
import store, {
  setName,
  LOCALSTORAGE_STATE_KEY,
  setOrangeTilePoint,
} from "./store";
import UIScene from "./UI";

export const initializeDebug = () => {
  (window as any).debug = {
    get store() {
      return store;
    },
    setPlayerName: (name) => {
      store.dispatch(setName(name));
      return (window as any).debug;
    },
    reset: () => {
      localStorage.setItem(LOCALSTORAGE_STATE_KEY, "");
      window.location.reload();
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
  };
};
