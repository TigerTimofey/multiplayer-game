import { showGameOver } from "../../game-process/gameOver.js";

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

      if (myCoins > otherPlayer.coins) {
        const updates = {};
        updates[`players/${playerId}/kills`] =
          (players[playerId].kills || 0) + 1;
        updates[`players/${key}/isDefeated`] = true;
        updates[`players/${key}/defeatedBy`] = {
          name: players[playerId].name,
          coins: myCoins,
          kills: (players[playerId].kills || 0) + 1,
        };

        firebase
          .database()
          .ref()
          .update(updates)
          .then(() => {
            const roomStatsRef = firebase
              .database()
              .ref(`rooms/${currentRoomCode}/stats`);
            roomStatsRef.transaction((stats) => {
              if (!stats) {
                return { totalCoins: 0, totalKills: 1 };
              }
              return { ...stats, totalKills: (stats.totalKills || 0) + 1 };
            });

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

            if (gameOverModal) {
              showGameOver(
                {
                  name: otherPlayer.name,
                  coins: otherPlayer.coins,
                  kills: (otherPlayer.kills || 0) + 1,
                },
                { ...playerStats, playerId },
                gameOverModal
              );
            } else {
              console.error("gameOverModal is not defined.");
            }

            const myElement = playerElements[playerId];
            if (myElement) {
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
            } else {
              console.warn(
                `Player element for playerId ${playerId} is missing.`
              );
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
