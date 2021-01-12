import localforage from "localforage";
import { Mutex } from "async-mutex";

const LOCALFORAGE_PERSISTENCE_KEY = "LOCALFORAGE_PERSISTENCE_KEY";

let persisted: null | object = null;
const mutex = new Mutex();

export const preload = async () => {
  persisted = (await localforage.getItem(LOCALFORAGE_PERSISTENCE_KEY)) || {};
};

export const getPeristed = () => {
  if (!persisted) {
    throw new Error("need to preload persisted state");
  }
  return persisted;
};

export const persist = async (val: object) => {
  if (!persisted) {
    throw new Error("need to preload persisted state");
  }
  const release = await mutex.acquire();
  try {
    await localforage.setItem(LOCALFORAGE_PERSISTENCE_KEY, val);
    persisted = val;
    console.log("saved");
  } finally {
    release();
  }
};

export const reset = async () => await persist({});
