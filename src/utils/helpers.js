import { mapData } from "../core/constants/mapData.js";

export function randomFromArray(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export function getKeyString(x, y) {
  return `${x}x${y}`;
}

export function isSolid(x, y) {
  const blockedNextSpace = mapData.blockedSpaces[getKeyString(x, y)];
  return (
    blockedNextSpace ||
    x >= mapData.maxX ||
    x < mapData.minX ||
    y >= mapData.maxY ||
    y < mapData.minY
  );
}
