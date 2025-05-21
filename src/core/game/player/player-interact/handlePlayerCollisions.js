import { getRandomSafeSpot } from "../../../constants/mapData.js";
import state from "../../../state.js";

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

export function handlePlayerCollisions(playerId, otherPlayerId) {
  const player = state.getPlayers()[playerId];
  const otherPlayer = state.getPlayers()[otherPlayerId];

  if (player.shield) {
    const safeSpot = getRandomSafeSpot();
    otherPlayer.x = safeSpot.x;
    otherPlayer.y = safeSpot.y;
    otherPlayer.coins = 0;
    player.kills++;

    otherPlayer.element.style.transform = `translate3d(${
      16 * otherPlayer.x
    }px, ${16 * otherPlayer.y - 4}px, 0)`;
    otherPlayer.element.setAttribute("data-direction", otherPlayer.direction);

    showGameMessage(
      `${player.name}'s shield protected them from ${otherPlayer.name}!`
    );
    return;
  }

  if (player.coins > otherPlayer.coins) {
    const safeSpot = getRandomSafeSpot();
    otherPlayer.x = safeSpot.x;
    otherPlayer.y = safeSpot.y;
    otherPlayer.coins = 0;
    player.kills++;

    otherPlayer.element.style.transform = `translate3d(${
      16 * otherPlayer.x
    }px, ${16 * otherPlayer.y - 4}px, 0)`;

    showGameMessage(`${player.name} defeated ${otherPlayer.name}!`);
  } else {
    const safeSpot = getRandomSafeSpot();
    player.x = safeSpot.x;
    player.y = safeSpot.y;
    player.coins = 0;
    otherPlayer.kills++;

    player.element.style.transform = `translate3d(${16 * player.x}px, ${
      16 * player.y - 4
    }px, 0)`;

    showGameMessage(`${otherPlayer.name} defeated ${player.name}!`);
  }
}
