import { getRandomSafeSpot } from "../../constants/mapData.js";

export function handleSinglePlayerCollisions(player, bot, gameState) {
  const hitAudio = new Audio("./assets/audio/hit.mp3");
  hitAudio.play();

  if (player.shield) {
    const safeSpot = getRandomSafeSpot();
    bot.x = safeSpot.x;
    bot.y = safeSpot.y;
    bot.coins = 0;
    player.kills++;

    bot.element.style.transform = `translate3d(${16 * bot.x}px, ${
      16 * bot.y - 4
    }px, 0)`;
    bot.element.setAttribute("data-direction", bot.direction);

    const botCoinsDisplay = bot.element.querySelector(".Character_coins");
    if (botCoinsDisplay) {
      botCoinsDisplay.textContent = ` 0`;
    }

    showGameMessage(`${player.name}'s shield protected them from ${bot.name}!`);
    return;
  }

  // Check if bot has active shield
  if (bot.shield) {
    const safeSpot = getRandomSafeSpot();
    player.x = safeSpot.x;
    player.y = safeSpot.y;
    player.coins = 0;
    bot.kills++;

    player.element.style.transform = `translate3d(${16 * player.x}px, ${
      16 * player.y - 4
    }px, 0)`;

    const playerCoinsDisplay = player.element.querySelector(".Character_coins");
    if (playerCoinsDisplay) {
      playerCoinsDisplay.textContent = ` 0`;
    }

    showGameMessage(
      `${bot.name}'s strength power protected them from ${player.name}!`
    );
    return;
  }

  if (player.coins > bot.coins) {
    const safeSpot = getRandomSafeSpot();
    bot.x = safeSpot.x;
    bot.y = safeSpot.y;
    bot.coins = 0;
    player.kills++;

    bot.element.style.transform = `translate3d(${16 * bot.x}px, ${
      16 * bot.y - 4
    }px, 0)`;

    const botCoinsDisplay = bot.element.querySelector(".Character_coins");
    if (botCoinsDisplay) {
      botCoinsDisplay.textContent = ` 0`;
    }

    showGameMessage(`${player.name} defeated ${bot.name}!`);
  } else {
    const safeSpot = getRandomSafeSpot();
    player.x = safeSpot.x;
    player.y = safeSpot.y;
    player.coins = 0;
    bot.kills++;

    player.element.style.transform = `translate3d(${16 * player.x}px, ${
      16 * player.y - 4
    }px, 0)`;

    const playerCoinsDisplay = player.element.querySelector(".Character_coins");
    if (playerCoinsDisplay) {
      playerCoinsDisplay.textContent = ` 0`;
    }

    showGameMessage(`${bot.name} defeated ${player.name}!`);
  }

  if (gameState && typeof gameState.updateScoreboard === "function") {
    gameState.updateScoreboard();
  }
}

function showGameMessage(message) {
  let messageElement = document.querySelector(".message");

  if (!messageElement) {
    messageElement = document.createElement("div");
    messageElement.className = "message";
    document.body.appendChild(messageElement);
  }

  messageElement.textContent = message;
  messageElement.style.display = "block";

  setTimeout(() => {
    messageElement.style.display = "none";
  }, 3000);
}
