import { showGameOver } from "../../game-process/gameOver.js";
import { getRandomSafeSpot } from "../../../constants/mapData.js";
import state from "../../../state.js";

export function checkPlayerCollisions(
  x,
  y,
  {
    players,
    playerId,
    playerRef,
    currentRoomCode,
    gameOverModal,
    playerElements,
  }
) {
  if (players[playerId].shield) return;

  const myCoins = players[playerId].isGiant
    ? players[playerId].coins * 2
    : players[playerId].coins;

  Object.keys(players).forEach((key) => {
    if (key === playerId) return;

    const otherPlayer = players[key];
    if (otherPlayer.x === x && otherPlayer.y === y) {
      const hitAudio = new Audio("./assets/audio/hit.mp3");
      hitAudio.play();

      const updates = {};
      const safeSpot = getRandomSafeSpot();

      const statsUpdates = {};
      const roomStatsRef = `rooms/${currentRoomCode}/stats`;
      const winnerStatsRef = `rooms/${currentRoomCode}/playerStats/${
        myCoins > otherPlayer.coins ? playerId : key
      }`;

      if (myCoins > otherPlayer.coins) {
        updates[`players/${key}/x`] = safeSpot.x;
        updates[`players/${key}/y`] = safeSpot.y;
        updates[`players/${key}/coins`] = 0;
        updates[`players/${playerId}/kills`] =
          (players[playerId].kills || 0) + 1;

        statsUpdates[`${roomStatsRef}/totalKills`] =
          firebase.database.ServerValue.increment(1);
        statsUpdates[`${winnerStatsRef}/totalKills`] =
          firebase.database.ServerValue.increment(1);
      } else {
        updates[`players/${playerId}/x`] = safeSpot.x;
        updates[`players/${playerId}/y`] = safeSpot.y;
        updates[`players/${playerId}/coins`] = 0;
        updates[`players/${key}/kills`] = (otherPlayer.kills || 0) + 1;

        // Update kill stats
        statsUpdates[`${roomStatsRef}/totalKills`] =
          firebase.database.ServerValue.increment(1);
        statsUpdates[`${winnerStatsRef}/totalKills`] =
          firebase.database.ServerValue.increment(1);
      }

      firebase
        .database()
        .ref()
        .update({
          ...updates,
          ...statsUpdates,
        });

      const messageRef = firebase
        .database()
        .ref(`rooms/${currentRoomCode}/messages`);
      const winner =
        myCoins > otherPlayer.coins ? players[playerId] : otherPlayer;
      const loser =
        myCoins > otherPlayer.coins ? otherPlayer : players[playerId];
      messageRef.push({
        action: `${winner.name} defeated ${loser.name}!`,
        timestamp: Date.now(),
      });
    }
  });
}
