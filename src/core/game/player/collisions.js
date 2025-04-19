import { showGameOver } from "../game-process/gameOver.js";

export function checkPlayerCollisions(
  x,
  y,
  { players, playerId, playerRef, currentRoomCode }
) {
  if (players[playerId].shield) return;

  const myCoins = players[playerId].isGiant
    ? players[playerId].coins * 2
    : players[playerId].coins;

  Object.keys(players).forEach((key) => {
    if (key === playerId) return;

    const otherPlayer = players[key];
    if (otherPlayer.x === x && otherPlayer.y === y) {
      if (players[playerId].powers?.shield) return;

      if (myCoins > otherPlayer.coins) {
        // Update killer's stats first, then handle defeated player
        const updates = {};
        updates[`players/${playerId}/kills`] =
          (players[playerId].kills || 0) + 1;
        updates[`players/${key}/isDefeated`] = true;
        updates[`players/${key}/defeatedBy`] = {
          name: players[playerId].name,
          coins: myCoins,
          kills: (players[playerId].kills || 0) + 1,
        };

        // Use single update for atomic operation
        firebase
          .database()
          .ref()
          .update(updates)
          .then(() => {
            // Update room stats for total kills
            const roomStatsRef = firebase
              .database()
              .ref(`rooms/${currentRoomCode}/stats`);
            roomStatsRef.transaction((stats) => {
              if (!stats) {
                return { totalCoins: 0, totalKills: 1 };
              }
              return { ...stats, totalKills: (stats.totalKills || 0) + 1 };
            });

            // Update individual player stats for total kills
            const playerStatsRef = firebase
              .database()
              .ref(`rooms/${currentRoomCode}/playerStats/${playerId}`);
            playerStatsRef.transaction((stats) => {
              if (!stats) {
                return { totalCoins: 0, totalKills: 1 };
              }
              return { ...stats, totalKills: (stats.totalKills || 0) + 1 };
            });

            setTimeout(() => {
              firebase.database().ref(`players/${key}`).remove();
            }, 1000);
          })
          .catch((error) => console.error("Update failed:", error));
      } else if (myCoins < otherPlayer.coins) {
        // Update winner's kills first, then remove defeated player
        const updates = {};
        updates[`players/${key}/kills`] = (otherPlayer.kills || 0) + 1;

        firebase
          .database()
          .ref()
          .update(updates)
          .then(() => {
            const playerStats = {
              coins: players[playerId].coins,
              joinTime: players[playerId].joinTime,
              kills: players[playerId].kills || 0,
              startTime: players[playerId].startTime,
            };

            showGameOver(
              {
                name: otherPlayer.name,
                coins: otherPlayer.coins,
                kills: (otherPlayer.kills || 0) + 1,
              },
              playerStats
            );

            const myElement = playerElements[playerId];
            // Add random scatter directions for death animation
            myElement.style.setProperty(
              "--scatter-x",
              Math.random() * 40 - 20 + "px"
            );
            myElement.style.setProperty(
              "--scatter-y",
              Math.random() * 40 - 20 + "px"
            );
            myElement.style.setProperty(
              "--scatter-rotate",
              Math.random() * 360 + "deg"
            );
            myElement.classList.add("eliminated");

            // Create additional pixel fragments
            for (let i = 0; i < 6; i++) {
              const fragment = document.createElement("div");
              fragment.className = "Character_sprite";
              fragment.style.position = "absolute";
              fragment.style.setProperty(
                "--scatter-x",
                Math.random() * 60 - 30 + "px"
              );
              fragment.style.setProperty(
                "--scatter-y",
                Math.random() * 60 - 30 + "px"
              );
              fragment.style.setProperty(
                "--scatter-rotate",
                Math.random() * 360 + "deg"
              );
              fragment.style.animation = "pixelScatter 0.8s forwards";
              fragment.style.opacity = "0.7";
              myElement.appendChild(fragment);
            }

            setTimeout(() => {
              playerRef.remove();
            }, 1000);
          })
          .catch((error) => console.error("Update failed:", error));
      }
    }
  });
}
