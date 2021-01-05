import localforage from "localforage";
import Chance from "chance";
import { Mutex } from "async-mutex";
import firebase from "firebase/app";
import "firebase/firestore";

import eventsCenter, { HoleDepth } from "./EventsCenter";
import MessageState, { depthFor, messagesFor, next } from "./Messages";

const RANDOM_SEED_KEY = "random_seed_3";
const CHANGES_KEY = "changes_3";
const MESSAGE_STATE_KEY = "message_state3";
const PLAYER_NAME_KEY = "player_name";

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
  private db: firebase.firestore.Firestore;
  private changes: Map<integer, Change>;
  private randomSeed: integer;
  private messageState: MessageState;
  private playerName: string;
  private mutex = new Mutex();

  private constructor(
    db: firebase.firestore.Firestore,
    messageState: MessageState,
    changes: Map<integer, Change>,
    randomSeed: integer,
    playerName: string
  ) {
    this.db = db;
    this.changes = changes;
    this.randomSeed = randomSeed;
    this.messageState = messageState;
    this.playerName = playerName;

    db.collection("user_depths").onSnapshot((snapshot) => {
      const holeDepths: HoleDepth[] = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          const name = (data.name as any) as string;
          const depth = (data.depth as any) as integer;
          return { name, depth };
        })
        .sort((a, b) => a.depth - b.depth);
      eventsCenter.emit("leaderboard", holeDepths);
    });

    eventsCenter.on("my_hole_depth", (depth) => {
      db.collection("user_depths").doc(this.randomSeed.toString()).set(depth);
      const nextState = next(this.messageState);
      const nextDepth = nextState && depthFor(nextState);
      if (nextDepth && depth.depth >= nextDepth) {
        this.setMessageState(nextState);
      }
    });
  }

  public static shared(): PersistentStore {
    return PersistentStore.instance;
  }

  public static async initialize(): Promise<PersistentStore> {
    const firebaseConfig = {
      apiKey: "AIzaSyBn-3sl-t03yBJKYrNLcuthCuR8IYPPa_8",
      authDomain: "digahole-b35b3.firebaseapp.com",
      projectId: "digahole-b35b3",
      storageBucket: "digahole-b35b3.appspot.com",
      messagingSenderId: "1093189461597",
      appId: "1:1093189461597:web:8f91997b3febed0c69cfb4",
    };
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    const chance = new Chance();
    let randomSeed = await this.getOrDefault(RANDOM_SEED_KEY, () =>
      chance.integer({ min: 0 })
    );
    let changes: [integer, Change][] = await this.getOrDefault(
      CHANGES_KEY,
      () => []
    );
    let introLoaded = await this.getOrDefault(
      MESSAGE_STATE_KEY,
      () => MessageState.Intro
    );
    let playerName = await this.getOrDefault(
      PLAYER_NAME_KEY,
      () => "Agnomenymous"
    );
    PersistentStore.instance = new PersistentStore(
      db,
      introLoaded,
      new Map(changes),
      randomSeed,
      playerName
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

  setPlayerName(name: string) {
    this.playerName = name;
    if (this.messageState === MessageState.ThreeMeters) {
      this.setMessageState(MessageState.ThreeMetersWithName);
    }
    this.sync();
  }

  setMessageState(messageState) {
    if (this.messageState !== messageState) {
      this.messageState = messageState;
      eventsCenter.emit("new_message_state", this.messageState);
      this.sync();
    }
  }

  getMessageState(): MessageState {
    return this.messageState;
  }

  getPlayerName() {
    return this.playerName;
  }

  static async getOrDefault<T>(key, orDefault: () => T): Promise<T> {
    let val: T | null = await localforage.getItem(key);
    if (!val) {
      val = orDefault();
      await localforage.setItem(key, val);
    }
    return val;
  }

  async sync() {
    const release = await this.mutex.acquire();
    try {
      await localforage.setItem(CHANGES_KEY, [...this.changes]);
      await localforage.setItem(PLAYER_NAME_KEY, this.playerName);
      await localforage.setItem(MESSAGE_STATE_KEY, this.messageState);
      console.log("sync complete");
    } finally {
      release();
    }
  }

  getRandomSeed(): integer {
    return this.randomSeed;
  }
}

(window as any).debug = {
  setPlayerName: (name) => {
    PersistentStore.shared().setPlayerName(name);
    return (window as any).debug;
  },
  setMessageState: (messageState) => {
    PersistentStore.shared().setMessageState(messageState);
    return (window as any).debug;
  },
};
