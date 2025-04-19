export function randomFromArray(array) {
  return array[Math.floor(Math.random() * array.length)];
}

export function getKeyString(x, y) {
  return `${x}x${y}`;
}
