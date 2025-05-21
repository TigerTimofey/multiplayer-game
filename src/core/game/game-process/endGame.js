import { showMatchEndedModal } from "../../components/modal/showMatchEndedModal.js";
import { GAME_MODES } from "../../constants/gameModes.js";
import state from "../../state.js";

export function endGame() {
  const roomRef = firebase
    .database()
    .ref(`rooms/${state.getCurrentRoomCode()}`);

  roomRef.once("value").then((snapshot) => {
    const roomData = snapshot.val();
    const gameMode = GAME_MODES[roomData.gameMode];
    let topKillsPlayer = { name: "None", kills: 0 };
    let topCoinsPlayer = { name: "None", coins: 0 };

    if (gameMode.specialRules?.winCondition === "lastStanding") {
      const playerStatsRef = firebase
        .database()
        .ref(`rooms/${state.getCurrentRoomCode()}/playerStats`);
      const playersRef = firebase
        .database()
        .ref(`rooms/${state.getCurrentRoomCode()}/players`);

      Promise.all([
        playerStatsRef.once("value"),
        playersRef.once("value"),
      ]).then(([statsSnapshot, playersSnapshot]) => {
        const stats = statsSnapshot.val();
        const players = playersSnapshot.val();

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
      });
    } else if (gameMode.specialRules?.winCondition === "treasure") {
      const players = roomData.players || {};
      Object.entries(players).forEach(([playerId, player]) => {
        if (player.storedCoins >= 25) {
          roomRef.update({
            gameEnded: true,
            winner: {
              name: player.name,
              color: player.color,
              coins: player.storedCoins,
            },
          });
        }
      });
    }

    showMatchEndedModal(topKillsPlayer, topCoinsPlayer);
  });
}
