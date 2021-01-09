export type keyType = "left" | "right" | "up";

let left = false;
let right = false;
let up = false;

export const getKeys = () => {
  return {
    left,
    right,
    up,
  };
};

export const setKey = (key: keyType, isDown: boolean) => {
  switch (key) {
    case "left":
      left = isDown;
      break;
    case "right":
      right = isDown;
      break;
    case "up":
      up = isDown;
      break;
  }
};
