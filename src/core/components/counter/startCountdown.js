import { startGame } from "../../game/game-process/startGame.js";

export function startCountdown(roomRef) {
  const countdownOverlay = document.createElement("div");
  countdownOverlay.className = "countdown-overlay";
  document.body.appendChild(countdownOverlay);

  let count = 3;

  function updateCount() {
    countdownOverlay.innerHTML = `<div class="countdown-number">${count}</div>`;
  }

  updateCount();

  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      updateCount();
    } else if (count === 0) {
      countdownOverlay.innerHTML = `<div class="countdown-number">GO!</div>`;
    } else {
      clearInterval(interval);
      countdownOverlay.remove();
      // Set gameStarted flag in database when countdown finishes
      roomRef.update({ gameStarted: true }).then(() => startGame());
    }
  }, 1000);
}
