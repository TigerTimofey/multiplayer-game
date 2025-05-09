import { startGameTimer } from "../../components/counter/startGameTimer.js";
import { getRandomSafeSpot } from "../../constants/mapData.js";
import { initGame } from "./initGame.js";
import state from "../../state.js";
import { GAME_MODES } from "../../constants/gameModes.js";
import { mapData } from "../../constants/mapData.js";

export function startGame() {
  const roomRef = firebase
    .database()
    .ref(`rooms/${state.getCurrentRoomCode()}`);

  roomRef.once("value").then((snapshot) => {
    const roomData = snapshot.val();
    const gameMode = GAME_MODES[roomData.gameMode];
    const players = roomData.players || {};
    const playerIndex = Object.keys(players).indexOf(state.getPlayerId());
    const { x, y } = getRandomSafeSpot();

    const startingCoins = gameMode.specialRules?.startingCoins || 0;
    const speedMultiplier = gameMode.specialRules?.speedMultiplier || 1;

    state
      .getPlayerRef()
      .set({
        id: state.getPlayerId(),
        name: state.getSavedPlayerName(),
        direction: "right",
        color: state.getSavedPlayerColor(),
        x,
        y,
        coins: startingCoins,
        storedCoins: 0,
        playerIndex,
        speed: speedMultiplier,
        kills: 0,
        joinTime: Date.now(),
        startTime: Date.now(),
      })
      .then(() => {
        document.querySelector("#lobby").classList.add("hidden");
        document.querySelector("#game-content").classList.remove("hidden");
        startGameTimer(roomData.roundTime);
        initGame();
      });

    if (gameMode.specialRules?.hazardsEnabled) {
      mapData.generateRandomHazards(8);
      const hazardsRef = firebase
        .database()
        .ref(`rooms/${state.getCurrentRoomCode()}/hazards`);
      hazardsRef.set(mapData.hazards);
    }
  });
}
