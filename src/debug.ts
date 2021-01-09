import store, { setName, LOCALSTORAGE_STATE_KEY } from "./store";

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
  };
};
