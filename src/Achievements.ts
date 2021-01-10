import _ from "lodash";

import absurd from "./absurd";
import megaPrompt from "./megaPrompt";
import store, { setName } from "./store";
import type { RootState } from "./store";
import { mobile } from "./isMobile";

export type AchievementType =
  | "intro"
  | "tutorial"
  | "name_prompt"
  | "has_name"
  | "mushroom"
  | "leaderboard"
  | "portal_hint"
  | "portal_touch"
  | "endgame"
  | "victory"
  | "victory_nosweatshirt";
// | "secret"
// | "fall_through_earth";

type achievement = {
  type: AchievementType;
  prerequisites: AchievementType[];
  check: (s: RootState) => boolean;
  uponEarning?: () => void;
};

const achievements: achievement[] = [
  { type: "intro", prerequisites: [], check: () => true },
  { type: "tutorial", prerequisites: ["intro"], check: () => true },
  {
    type: "name_prompt",
    prerequisites: ["tutorial"],
    check: (state) => state.holeDepth.current >= 5 && !state.player.name,
  },
  {
    type: "has_name",
    prerequisites: ["name_prompt"],
    check: (state) => !!state.player.name,
  },
  {
    type: "mushroom",
    prerequisites: [],
    check: (state) => state.player.hasTouchedMushroom,
  },
  {
    type: "leaderboard",
    prerequisites: ["has_name"],
    check: (state) => state.holeDepth.current >= 10,
  },
  {
    type: "portal_hint",
    prerequisites: ["leaderboard"],
    check: (state) => state.holeDepth.current >= 18,
  },
  {
    type: "portal_touch",
    prerequisites: [],
    check: (state) => state.player.hasTouchedPortal,
  },
  {
    type: "endgame",
    prerequisites: ["leaderboard"],
    check: (state) => state.holeDepth.current >= 30,
  },
  {
    type: "victory",
    prerequisites: ["endgame"],
    check: (state) => {
      const max = _.maxBy(state.leaderboard, (entry) => entry.depth);
      return (
        !!max &&
        max.randomSeed === state.randomSeed &&
        state.leaderboard.length > 1
      );
    },
  },
  {
    type: "victory_nosweatshirt",
    prerequisites: ["victory"],
    check: (state) => true,
  },
];

export const earnedAchievement = (
  state: RootState
): AchievementType | undefined => {
  return _.find(achievements, (achievement) => {
    const existing = state.achievements;
    return (
      !existing.includes(achievement.type) &&
      _.every(achievement.prerequisites, (p) => existing.includes(p)) &&
      achievement.check(state)
    );
  })?.type;
};

export const afterEarning = (type: AchievementType) => () => {
  switch (type) {
    case "name_prompt":
      const name = megaPrompt(
        "Enter your full legal name, as it appears on your drivers license or birth certificate.",
        "No seriously",
        (val) => !!val && val !== ""
      )?.replace(/😎/g, "");
      store.dispatch(setName(name || ""));
      break;
    case "victory":
      megaPrompt(
        "Please enter your shipping address.",
        "Invalid shipping address. Please enter your shipping address.",
        (val) => !val
      );
  }
};

export const messagesFor = (
  type: AchievementType,
  state: RootState
): string[] => {
  const { name } = state.player;
  switch (type) {
    case "intro":
      return []; // handled in intro scene
    case "tutorial":
      return [
        "Hello, humble holer!",
        mobile
          ? "Move and jump with the arrows."
          : "Move and jump with the arrow keys or WASD.",
        mobile ? "Tap on dirt to dig!" : "Click on dirt to dig!",
        "You can only dig squares that you're next to.",
        "And you have to empty your shovel before you can dig again.",
        "If you empty your shovel where you're standing, you will do a convenient little hop.",
        "Dig a deep and beautiful hole!",
      ];
    case "name_prompt":
      return [
        "What a hefty hole you have hauled!",
        "By the way, dear digger, what is your name?",
      ];
    case "has_name":
      return [
        `Bonjour, ${name}! What a beautiful name.`,
        `${name}, if you dig me a 10m deep hole, I will show you something very motivating.`,
      ];
    case "mushroom":
      return [
        "<gasp> A merry mushroom!",
        "What a flexible fungus! An elastic excrescence!",
        "Life hack: you can move merry mushrooms around by digging them.",
        "What of life's problems *can't* be dug away?!",
      ];
    case "leaderboard":
      return [
        "Such a voluminous void! An ample aperture!! A cromulent chasm!!!",
        `Okay, so I have some bad news ${name}. You're not the only person digging a hole.`,
        "There are other, deeper, better holes out there.",
        "But now I will tell you the leaderboard when you click the 👑, so you can have a peek at your pit's performance.",
        "Anyway I need to go return some videotapes. Keep digging deeper and I'll check in again in a little bit.",
      ];
    case "portal_hint":
      return [
        "<bigger gasp than before> I can sense you are near a thing of great and terrible power!",
        "It is said that only adventurers of legendary toil capacity can reach it.",
        "But that they will be handsomely rewarded for their toils.",
        "Handsomely rewarded with a fucken' deep-ass hole, I'll bet!",
        "Anyway I've turned your shovel into a lil' compass to the thingy. 😘",
      ];
    case "portal_touch":
      return [
        `Good grief ${name}! It's a portal to the ass-tral plane! I haven't seen one of these since Burning Man!`,
        "When you're standing on the portal, push the jump button to rub the energy crystal that you carry in your pocket at all times and transcend your puny physical form.",
        "Just like merry mushrooms, you can move ass-tral portals around by digging them.",
        "Think of how deep you'll be able to dig with this thing! Surely this was worth the toil!!",
        "Get a little deeper and we will begin ⚡Cyberhole 2021: ENDGAME⚡.",
      ];
    case "endgame":
      const max = _.maxBy(state.leaderboard, (entry) => entry.depth);
      return [
        "What a, and I can't stress this enough, deep hole you have dug.",
        `Okay look I know what you're thinking ${name}.`,
        '"So what I\'m just supposed to keep digging now?"',
        "Well yes. But more specifically! I will now tell you how you ✨WIN THE GAME✨",
        "You win the game by DIGGING THE DEEPEST HOLE IN THE WORLD.",
        "Look, not that many people are going to play this game to begin with. And most of them don't make it this far.",
        `You just have to get to ${max?.depth} meters to bump off \"${max?.name}\".`,
        "It doesn't matter if someone out-digs you later: you just have to glimpse Val-hole-a for a beautiful instant in order to win the game.",
        "All winners will also receive a fabulous prize!",
      ];
    case "victory":
      return [
        "Hole-y heck, you won the game!!!!!!?!",
        `I can't believe this is happening! This is so incredible! Somebody really dug this deep! Look at your beautiful hole, ${name}!`,
        "Look there isn't any tracking or whatever in this game so I have no idea who you are. Please email idugahole@jackreed.computer immediately to share the news.",
        "And now for your fabulous prize!",
        "Your name will now have a 😎 emoji after it in the leaderboard!",
        "Ok ok fine there's more. You will also receive a FREE LIMITED EDITION CYBERHOLE 2021 CREW NECK SWEATSHIRT as my way of saying thanks for playing!!!",
        "Please enter your shipping address to receive your beautiful sweatshirt.",
      ];
    case "victory_nosweatshirt":
      return [
        "Aw, bummer to hear you didn't want a sweatshirt. But at least you'll have your 😎!",
        "OK, that's the end of the game! People have to outdig you in order to win now, so you can keep digging to make it harder for them if you want.",
        "And maybe there's a secret ending if you dig deep enough! But maybe not.",
        "2021 is definitely going to be your year!!!!!!!!!!!!",
      ];
    default:
      return absurd(type);
  }
};
