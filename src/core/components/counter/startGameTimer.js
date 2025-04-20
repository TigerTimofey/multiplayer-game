import { endGame } from "../../game/game-process/endGame.js";
import state from "../../state.js";

export function startGameTimer(duration) {
  const timerDisplay = document.querySelector("#timer-display");
  let timeLeft = duration;

  const timer = setInterval(() => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes}:${seconds
      .toString()
      .padStart(2, "0")}`;

    if (timeLeft === 0) {
      clearInterval(timer);
      endGame();
    }
    timeLeft--;
  }, 1000);

  firebase
    .database()
    .ref(`rooms/${state.getCurrentRoomCode()}`)
    .update({
      gameTimer: {
        startTime: Date.now(),
        duration: duration,
      },
    });
}
