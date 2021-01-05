import absurd from "./absurd";
import isMobile from "./isMobile";
import PersistentStore from "./PersistentStore";

enum MessageState {
  Intro,
  Tutorial,
  ThreeMeters,
  ThreeMetersWithName,
  TenMeters,
  TwentyMeters,
}

export type Messages = string[];

export const next = (state: MessageState): MessageState | null => {
  switch (state) {
    case MessageState.Intro:
      return MessageState.Tutorial;
    case MessageState.Tutorial:
      return MessageState.ThreeMeters;
    case MessageState.ThreeMeters:
      return MessageState.ThreeMetersWithName;
    case MessageState.ThreeMetersWithName:
      return MessageState.TenMeters;
    case MessageState.TenMeters:
      return MessageState.TwentyMeters;
    case MessageState.TwentyMeters:
      return null;
    default:
      return absurd(state);
  }
};

export const depthFor = (state: MessageState): integer | null => {
  switch (state) {
    case MessageState.Intro:
      return null;
    case MessageState.Tutorial:
      return null;
    case MessageState.ThreeMeters:
      return 3;
    case MessageState.ThreeMetersWithName:
      return null;
    case MessageState.TenMeters:
      return 10;
    case MessageState.TwentyMeters:
      return 20;
    default:
      return absurd(state);
  }
};

export const messagesFor = (
  scene: Phaser.Scene,
  state: MessageState
): Messages => {
  const mobile = isMobile(scene);
  switch (state) {
    case MessageState.Intro:
      return [];
    case MessageState.Tutorial:
      return [
        "Hello, humble holer!",
        mobile
          ? "Move and jump with the arrows."
          : "Move and jump with the arrow keys or WASD.",
        mobile
          ? "Tap to dig on adjacent tiles."
          : "Click to dig on adjacent tiles.",
        "You have to empty your shovel before you can dig again.",
        "If you empty your shovel where you're standing, you will do a convenient little hop.",
        "Dig a deep and beautiful hole!",
      ];
    case MessageState.ThreeMeters:
      return [
        "What a hefty hole you have hauled!",
        "By the way, dear digger, what is your name?",
      ];
    case MessageState.ThreeMetersWithName:
      const name = PersistentStore.shared().getPlayerName();
      return [
        `Bonjour, ${name}! What a beautiful name.`,
        `${name}, if you dig me a 10m deep hole, I will show you something very motivating.`,
      ];
    case MessageState.TenMeters:
      return [
        "Such a voluminous void! An ample aperture!! A cromulent chasm!!!",
        "Okay, so I have some bad news. You're not the only person digging a hole.",
        "There are other, better, deeper holes out there.",
        "But now you can see them in the 🏆leaderboard🏆! And chortle at the smaller, patheticer pits.",
        "Anyway I'll check in again once you're a little deeper.",
      ];
    case MessageState.TwentyMeters:
      return [
        "Useful caverns, am I right? Maybe there will be more of them later!",
        "Down here you might discover objects of great and terrible power.",
        "More realistically you might also discover some dirt!",
        "Can you dig the deepest hole in the world?!",
      ];
    default:
      return absurd(state);
  }
};

export default MessageState;
