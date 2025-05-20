import { getRandomSafeSpot } from "../../constants/mapData.js";

/**
 * Handle collisions between player and bots in single player mode
 */
export function handleSinglePlayerCollisions(player, bot, gameState) {
  // Play hit sound
  const hitAudio = new Audio("./assets/audio/hit.mp3");
  hitAudio.play();

  // If player has shield active, they always win regardless of coins
  if (player.shield) {
    // Player automatically wins with shield
    const safeSpot = getRandomSafeSpot();
    bot.x = safeSpot.x;
    bot.y = safeSpot.y;
    bot.coins = 0;
    player.kills++;

    // Update bot position without affecting the shadow
    bot.element.style.transform = `translate3d(${16 * bot.x}px, ${
      16 * bot.y - 4
    }px, 0)`;
    bot.element.setAttribute("data-direction", bot.direction);

    // Show message
    showGameMessage(`${player.name}'s shield protected them from ${bot.name}!`);
    return;
  }

  // Determine who has more coins if no shield
  if (player.coins > bot.coins) {
    // Player wins the collision
    const safeSpot = getRandomSafeSpot();
    bot.x = safeSpot.x;
    bot.y = safeSpot.y;
    bot.coins = 0;
    player.kills++;

    // Update bot position
    bot.element.style.transform = `translate3d(${16 * bot.x}px, ${
      16 * bot.y - 4
    }px, 0)`;

    // Show message
    showGameMessage(`${player.name} defeated ${bot.name}!`);
  } else {
    // Bot wins the collision
    const safeSpot = getRandomSafeSpot();
    player.x = safeSpot.x;
    player.y = safeSpot.y;
    player.coins = 0;
    bot.kills++;

    // Update player position
    player.element.style.transform = `translate3d(${16 * player.x}px, ${
      16 * player.y - 4
    }px, 0)`;

    // Show message
    showGameMessage(`${bot.name} defeated ${player.name}!`);
  }
}

/**
 * Show a temporary game message
 */
function showGameMessage(message) {
  let messageElement = document.querySelector(".message");

  if (!messageElement) {
    messageElement = document.createElement("div");
    messageElement.className = "message";
    document.body.appendChild(messageElement);
  }

  messageElement.textContent = message;
  messageElement.style.display = "block";

  // Remove the message after 3 seconds
  setTimeout(() => {
    messageElement.style.display = "none";
  }, 3000);
}
