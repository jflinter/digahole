import firebase from "firebase/app";
import "firebase/firestore";
import _ from "lodash";
import { map, filter, distinctUntilChanged } from "rxjs/operators";

import store, { getState$, setLeaderboard } from "./store";
import type { LeaderboardEntry } from "./store";

// @ts-ignore
console.log(`firebase suffix: ${process.env.FIREBASE_SUFFIX}`);

// @ts-ignore
console.log(`node env: ${process.env.NODE_ENV}`);

const DEPTHS_TABLE = `user_depths_${
  // @ts-ignore
  process.env.FIREBASE_SUFFIX || "development"
}`;

console.log(`depths table: ${DEPTHS_TABLE}`);

const firebaseConfig = {
  apiKey: "AIzaSyBn-3sl-t03yBJKYrNLcuthCuR8IYPPa_8",
  authDomain: "digahole-b35b3.firebaseapp.com",
  projectId: "digahole-b35b3",
  storageBucket: "digahole-b35b3.appspot.com",
  messagingSenderId: "1093189461597",
  appId: "1:1093189461597:web:8f91997b3febed0c69cfb4",
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const updateDepth = (entry: LeaderboardEntry) => {
  db.collection(DEPTHS_TABLE).doc(entry.randomSeed).set(entry);
};
db.collection(DEPTHS_TABLE).onSnapshot((snapshot) => {
  const holeDepths: LeaderboardEntry[] = snapshot.docs
    .map((doc) => {
      const data = doc.data();
      const name = (data.name as any) as string;
      const depth = ((data.depth as any) || (data.holeDepth as any)) as integer;
      const created = data.created || Date.now();
      const hasWon = !!data.hasWon;
      const randomSeed = doc.id;
      return { randomSeed, name, depth, created, hasWon };
    })
    .sort((a, b) => a.depth - b.depth);
  store.dispatch(setLeaderboard(holeDepths));
});
getState$()
  .pipe(
    map(
      (state): LeaderboardEntry => ({
        name: state.player.name,
        depth: state.holeDepth.current,
        randomSeed: state.randomSeed,
        hasWon: state.achievements.includes("victory"),
        created: state.holeDepth.updated,
      })
    ),
    filter((update) => !!update.name && !!update.depth && !!update.randomSeed),
    distinctUntilChanged(
      (e1, e2) => e1.name === e2.name && e1.depth == e2.depth
    )
  )
  .subscribe(updateDepth);

export const DB = db;
export const initializeFirebase = () => {
  return db;
};
