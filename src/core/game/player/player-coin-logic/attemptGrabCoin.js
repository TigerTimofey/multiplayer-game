import { getKeyString } from "../../../../utils/helpers.js";

export function attemptGrabCoin(x, y, gameState) {
  if (!gameState || !gameState.coins || !gameState.currentRoomCode) return;

  const { coins, playerRef, players, playerId, currentRoomCode } = gameState;
  const key = getKeyString(x, y);

  if (coins[key]) {
    const audio = new Audio("./assets/audio/getCoin.mp3");
    audio.play();

    firebase.database().ref(`coins/${key}`).remove();
    const coinsToAdd = players[playerId].doubleCoins ? 2 : 1;
    playerRef.update({
      coins: players[playerId].coins + coinsToAdd,
    });

    const roomStatsRef = firebase
      .database()
      .ref(`rooms/${currentRoomCode}/stats`);
    roomStatsRef.transaction((stats) => {
      if (!stats) {
        return { totalCoins: 1, totalKills: 0 };
      }
      return { ...stats, totalCoins: (stats.totalCoins || 0) + 1 };
    });

    const playerStatsRef = firebase
      .database()
      .ref(`rooms/${currentRoomCode}/playerStats/${playerId}`);
    playerStatsRef.transaction((stats) => {
      if (!stats) {
        return { totalCoins: 1, totalKills: 0 };
      }
      return { ...stats, totalCoins: (stats.totalCoins || 0) + 1 };
    });
  }
}
