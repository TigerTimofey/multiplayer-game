export function updatePlayerPosition(characterElement, x, y, scale = 1) {
  const left = 16 * x + "px";
  const top = 16 * y - 4 + "px";
  characterElement.style.transform = `translate3d(${left}, ${top}, 0) scale(${scale})`;
}
