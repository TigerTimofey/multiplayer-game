import { startGameTimer } from "../../components/counter/startGameTimer.js";
import { getRandomSafeSpot } from "../../constants/mapData.js";
import { initGame } from "./initGame.js";
import state from "../../state.js";

export function startGame() {
  const roomRef = firebase
    .database()
    .ref(`rooms/${state.getCurrentRoomCode()}`);

  roomRef.once("value").then((snapshot) => {
    const roomData = snapshot.val();
    const { x, y } = getRandomSafeSpot();

    state
      .getPlayerRef()
      .set({
        id: state.getPlayerId(),
        name: state.getSavedPlayerName(),
        direction: "right",
        color: state.getSavedPlayerColor(),
        x,
        y,
        coins: 140,
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
  });
}
