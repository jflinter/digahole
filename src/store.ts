import { configureStore, createSlice, PayloadAction } from "@reduxjs/toolkit";
import _ from "lodash";
import { Observable } from "rxjs";
import Chance from "chance";

import { TileKey } from "./TileKey";
import type { AchievementType } from "./Achievements";

export const LOCALSTORAGE_STATE_KEY = "LOCALSTORAGE_STATE_KEY_2";

let existingState = localStorage.getItem(LOCALSTORAGE_STATE_KEY);
let preloaded = existingState ? JSON.parse(existingState) : {};

const holeDepthSlice = createSlice({
  name: "holeDepth",
  initialState: { current: 0, max: 0, updated: Date.now() },
  reducers: {
    setHoleDepth(state, action: PayloadAction<integer>) {
      state.current = action.payload;
      state.max = Math.max(action.payload, state.max);
      state.updated = Date.now();
    },
  },
});

const achievementsSlice = createSlice({
  name: "achievements",
  initialState: Array<AchievementType>(),
  reducers: {
    addAchievement(state, action: PayloadAction<AchievementType>) {
      state.push(action.payload);
    },
  },
});

export type LeaderboardEntry = {
  randomSeed: string;
  name: string | null;
  depth: integer;
  created: integer;
  hasWon: boolean;
};
const leaderboardSlice = createSlice({
  name: "leaderboard",
  initialState: Array<LeaderboardEntry>(),
  reducers: {
    setLeaderboard(state, action: PayloadAction<Array<LeaderboardEntry>>) {
      return action.payload;
    },
  },
});

type Change = [integer, TileKey | null];
const changesSlice = createSlice({
  name: "changes",
  initialState: Array<Change>(),
  reducers: {
    addChange(state, action: PayloadAction<Change>) {
      state.push(action.payload);
    },
  },
});

const playerSlice = createSlice({
  name: "player",
  initialState: {
    name: null,
    shovelContents: null,
    hasTouchedMushroom: false,
    hasTouchedPortal: false,
  } as {
    name: string | null;
    shovelContents: TileKey | null;
    hasTouchedMushroom: boolean;
    hasTouchedPortal: boolean;
  },
  reducers: {
    setName(state, action: PayloadAction<string>) {
      state.name = action.payload;
    },
    setShovelContents(state, action) {
      state.shovelContents = action.payload;
    },
    hasTouchedMushroom(state) {
      state.hasTouchedMushroom = true;
    },
    hasTouchedPortal(state) {
      state.hasTouchedPortal = true;
    },
  },
});

const randomSeedSlice = createSlice({
  name: "randomSeed",
  initialState: new Chance().integer({ min: 0 }).toString(),
  reducers: {},
});

const store = configureStore({
  reducer: {
    achievements: achievementsSlice.reducer,
    holeDepth: holeDepthSlice.reducer,
    leaderboard: leaderboardSlice.reducer,
    changes: changesSlice.reducer,
    player: playerSlice.reducer,
    randomSeed: randomSeedSlice.reducer,
  },
  preloadedState: preloaded,
});

const saveState = () => {
  let state = store.getState();
  let json = JSON.stringify(state);
  localStorage.setItem(LOCALSTORAGE_STATE_KEY, json);
};

store.subscribe(saveState);

export const {
  setName,
  setLeaderboard,
  setHoleDepth,
  setShovelContents,
  addChange,
  hasTouchedMushroom,
  addAchievement,
} = {
  ...holeDepthSlice.actions,
  ...changesSlice.actions,
  ...leaderboardSlice.actions,
  ...playerSlice.actions,
  ...achievementsSlice.actions,
};

export type RootState = ReturnType<typeof store.getState>;

export const getState$: () => Observable<RootState> = () =>
  new Observable((observer) => {
    observer.next(store.getState());
    const unsubscribe = store.subscribe(() => {
      observer.next(store.getState());
    });
    return unsubscribe;
  });

export default store;
