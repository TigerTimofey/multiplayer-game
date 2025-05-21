/**
 * Create a player element
 */
export function createPlayerElement(
  name,
  x,
  y,
  direction,
  color,
  isYou = false
) {
  const characterElement = document.createElement("div");
  characterElement.classList.add("Character", "grid-cell");
  if (isYou) {
    characterElement.classList.add("you");
  }

  characterElement.setAttribute("data-direction", direction);
  characterElement.setAttribute("data-color", color);

  characterElement.style.transform = `translate3d(${16 * x}px, ${
    16 * y - 4
  }px, 0)`;

  const spriteElement = document.createElement("div");
  spriteElement.classList.add("Character_sprite", "grid-cell");
  characterElement.appendChild(spriteElement);

  const shadowElement = document.createElement("div");
  shadowElement.classList.add("Character_shadow", "grid-cell");
  characterElement.appendChild(shadowElement);

  const nameElement = document.createElement("div");
  nameElement.classList.add("Character_name-container");
  nameElement.textContent = name;

  const coins = document.createElement("span");
  coins.classList.add("Character_coins");
  coins.textContent = " 0";
  nameElement.appendChild(coins);

  characterElement.appendChild(nameElement);

  if (isYou) {
    const arrow = document.createElement("div");
    arrow.classList.add("Character_you-arrow");
    characterElement.appendChild(arrow);
  }

  return characterElement;
}

/**
 * Update player coin display
 */
export function updatePlayerCoins(playerElement, coins) {
  const coinsDisplay = playerElement.querySelector(".Character_coins");
  if (coinsDisplay) {
    coinsDisplay.textContent = ` ${coins}`;
  }
}
