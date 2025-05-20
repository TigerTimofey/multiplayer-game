import { getRandomSafeSpot } from "../../../constants/mapData.js";
import state from "../../../state.js";

// Use consistent message styling
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

export function handlePlayerCollisions(playerId, otherPlayerId) {
  const player = state.getPlayers()[playerId];
  const otherPlayer = state.getPlayers()[otherPlayerId];

  // If player has shield active, they always win regardless of coins
  if (player.shield) {
    // Player automatically wins with shield
    const safeSpot = getRandomSafeSpot();
    otherPlayer.x = safeSpot.x;
    otherPlayer.y = safeSpot.y;
    otherPlayer.coins = 0;
    player.kills++;

    // Update other player's position without affecting the shadow
    otherPlayer.element.style.transform = `translate3d(${
      16 * otherPlayer.x
    }px, ${16 * otherPlayer.y - 4}px, 0)`;
    otherPlayer.element.setAttribute("data-direction", otherPlayer.direction);

    // Show message
    showGameMessage(
      `${player.name}'s shield protected them from ${otherPlayer.name}!`
    );
    return;
  }

  // Determine who has more coins if no shield
  if (player.coins > otherPlayer.coins) {
    // Player wins the collision
    const safeSpot = getRandomSafeSpot();
    otherPlayer.x = safeSpot.x;
    otherPlayer.y = safeSpot.y;
    otherPlayer.coins = 0;
    player.kills++;

    // Update other player's position
    otherPlayer.element.style.transform = `translate3d(${
      16 * otherPlayer.x
    }px, ${16 * otherPlayer.y - 4}px, 0)`;

    // Show message
    showGameMessage(`${player.name} defeated ${otherPlayer.name}!`);
  } else {
    // Other player wins the collision
    const safeSpot = getRandomSafeSpot();
    player.x = safeSpot.x;
    player.y = safeSpot.y;
    player.coins = 0;
    otherPlayer.kills++;

    // Update player position
    player.element.style.transform = `translate3d(${16 * player.x}px, ${
      16 * player.y - 4
    }px, 0)`;

    // Show message
    showGameMessage(`${otherPlayer.name} defeated ${player.name}!`);
  }
}
