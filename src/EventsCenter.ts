import Phaser from "phaser";
import _ from "lodash";

import type { Keys } from "./Controls";

export type HoleDepth = { name: string; depth: integer };

type EventMap = Record<string, any>;
type EventKey<T extends EventMap> = string & keyof T;
type EventReceiver<T> = (params: T) => void;
interface Emitter<T extends EventMap> {
  on<K extends EventKey<T>>(eventName: K, fn: EventReceiver<T[K]>): void;
  emit<K extends EventKey<T>>(eventName: K, params: T[K]): void;
}

class CachingEmitter<T extends EventMap> implements Emitter<T> {
  private emitter = new Phaser.Events.EventEmitter();
  private cache = {};

  on<K extends EventKey<T>>(eventName: K, fn: EventReceiver<T[K]>) {
    this.cache[eventName.toString()] = null; // clear the cache when we add a new listener to ensure the listener is fired
    this.emitter.on(
      eventName,
      (val) => {
        if (_.isEqual(this.cache[eventName.toString()], val)) {
          return;
        }
        this.emitter.once("cache", (key) => (this.cache[key] = val));
        this.emitter.emit("cache", val);
        fn(val);
      },
      this
    );
  }

  emit<K extends EventKey<T>>(eventName: K, params: T[K]) {
    this.emitter.emit(eventName, params, this);
  }
}

function eventEmitter<T extends EventMap>(): Emitter<T> {
  return new CachingEmitter();
}

type EventType = {
  my_hole_depth: HoleDepth;
  keyboard: Keys;
  leaderboard: HoleDepth[];
};

const eventsCenter = eventEmitter<EventType>();

export default eventsCenter;
