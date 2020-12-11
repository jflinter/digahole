import localforage from "localforage";
import Chance from "chance";
import { Mutex } from "async-mutex";

const RANDOM_SEED_KEY = "random_seed";
const CHANGES_KEY = "changes";

export enum Change {
  DELETE = 0,
  PLACE_DIRT = 1,
  PLACE_MUSHROOM = 2,
}

/**
 * Stores things
 */
export default class PersistentStore {
  private static instance: PersistentStore;
  private changes: Map<integer, Change>;
  private randomSeed: integer;
  private mutex = new Mutex();

  private constructor(changes: Map<integer, Change>, randomSeed) {
    this.changes = changes;
    this.randomSeed = randomSeed;
  }

  public static shared(): PersistentStore {
    return PersistentStore.instance;
  }

  public static async initialize(): Promise<PersistentStore> {
    const chance = new Chance();
    let randomSeed = await localforage.getItem(RANDOM_SEED_KEY);
    if (!randomSeed) {
      randomSeed = chance.integer({ min: 0 });
      await localforage.setItem(RANDOM_SEED_KEY, randomSeed);
    }
    let changes: [integer, Change][] =
      (await localforage.getItem(CHANGES_KEY)) || [];
    PersistentStore.instance = new PersistentStore(
      new Map(changes),
      randomSeed
    );
    console.log(`random seed: ${randomSeed}`);
    return PersistentStore.instance;
  }

  addChange(idx: integer, type: Change) {
    this.changes.set(idx, type);
    this.sync();
  }

  getChanges(): Map<integer, Change> {
    return this.changes;
  }

  async sync() {
    const release = await this.mutex.acquire();
    try {
      await localforage.setItem(CHANGES_KEY, [...this.changes]);
      console.log("sync complete");
    } finally {
      release();
    }
  }

  getRandomSeed(): integer {
    return this.randomSeed;
  }
}
