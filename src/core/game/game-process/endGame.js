import { showMatchEndedModal } from "../../components/modal/showMatchEndedModal.js";
import state from "../../state.js";

export function endGame() {
  const playerStatsRef = firebase
    .database()
    .ref(`rooms/${state.getCurrentRoomCode()}/playerStats`);
  const playersRef = firebase
    .database()
    .ref(`rooms/${state.getCurrentRoomCode()}/players`);

  Promise.all([playerStatsRef.once("value"), playersRef.once("value")]).then(
    ([statsSnapshot, playersSnapshot]) => {
      const stats = statsSnapshot.val();
      const players = playersSnapshot.val();

      console.log("Game Over! Player Stats:");
      if (stats) {
        Object.entries(stats).forEach(([playerId, playerStats]) => {
          const playerName = players[playerId]?.name || "Unknown";
          console.log(
            `Player: ${playerName} (ID: ${playerId}) - Total Coins: ${playerStats.totalCoins}, Total Kills: ${playerStats.totalKills}`
          );
        });
      }

      let topKillsPlayer = { name: "None", kills: 0 };
      let topCoinsPlayer = { name: "None", coins: 0 };

      if (stats) {
        Object.entries(stats).forEach(([playerId, playerStats]) => {
          const playerName = players[playerId]?.name || "Unknown";
          if (playerStats.totalKills > topKillsPlayer.kills) {
            topKillsPlayer = {
              name: playerName,
              kills: playerStats.totalKills,
            };
          }
          if (playerStats.totalCoins > topCoinsPlayer.coins) {
            topCoinsPlayer = {
              name: playerName,
              coins: playerStats.totalCoins,
            };
          }
        });
      }
      showMatchEndedModal(topKillsPlayer, topCoinsPlayer);
    }
  );
}
