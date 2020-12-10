import localforage from "localforage";
import Chance from "chance";
import { Mutex } from "async-mutex";

/**
 * Stores things
 */
export default class PersistentStore {
  private static RANDOM_SEED_KEY = "random_seed";
  private static DIGS_KEY = "digs";
  private static UNDIGS_KEY = "undigs";
  private static instance: PersistentStore;
  private digs: Set<integer>;
  private unDigs: Set<integer>;
  private randomSeed: integer;
  private mutex = new Mutex();

  private constructor(digs: integer[], unDigs: integer[], randomSeed) {
    this.digs = new Set(digs);
    this.unDigs = new Set(unDigs);
    this.randomSeed = randomSeed;
  }

  public static shared(): PersistentStore {
    return PersistentStore.instance;
  }

  public static async initialize(): Promise<PersistentStore> {
    const chance = new Chance();
    let randomSeed = await localforage.getItem(PersistentStore.RANDOM_SEED_KEY);
    if (!randomSeed) {
      randomSeed = chance.integer({ min: 0 });
      await localforage.setItem(PersistentStore.RANDOM_SEED_KEY, randomSeed);
    }
    let digs: integer[] =
      (await localforage.getItem(PersistentStore.DIGS_KEY)) || [];
    let unDigs: integer[] =
      (await localforage.getItem(PersistentStore.UNDIGS_KEY)) || [];
    PersistentStore.instance = new PersistentStore(digs, unDigs, randomSeed);
    console.log(`random seed: ${randomSeed}`);
    return PersistentStore.instance;
  }

  addDig(idx: integer) {
    this.digs.add(idx);
    this.unDigs.delete(idx);
    this.sync();
  }

  getDigs(): Set<integer> {
    return this.digs;
  }

  addUnDig(idx: integer) {
    this.unDigs.add(idx);
    this.digs.delete(idx);
    this.sync();
  }

  getUnDigs(): Set<integer> {
    return this.unDigs;
  }

  async sync() {
    const release = await this.mutex.acquire();
    try {
      await localforage.setItem(PersistentStore.DIGS_KEY, [
        ...this.digs.values(),
      ]);
      await localforage.setItem(PersistentStore.UNDIGS_KEY, [
        ...this.unDigs.values(),
      ]);
      console.log("sync complete");
    } finally {
      release();
    }
  }

  getRandomSeed(): integer {
    return this.randomSeed;
  }
}
