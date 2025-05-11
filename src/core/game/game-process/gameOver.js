export function showGameOver(eliminatedBy, playerStats, gameOverModal) {
  gameOverModal.classList.remove("hidden");

  const eliminatedByEl = document.querySelector("#eliminated-by");

  if (eliminatedBy.isHazard) {
    eliminatedByEl.textContent = `Eliminated by a hazard worth ${
      eliminatedBy.coins || 0
    } coins!`;
  } else {
    eliminatedByEl.textContent = `Eliminated by ${eliminatedBy.name} who had ${eliminatedBy.coins} coins!`;
  }

  const causeOfDeathEl = document.createElement("div");

  if (eliminatedBy.isHazard) {
    causeOfDeathEl.textContent = "You hit a hazard!";
    causeOfDeathEl.style.backgroundColor = "red";
  }
  gameOverModal.appendChild(causeOfDeathEl);

  const audio = new Audio("./assets/audio/die.mp3");
  audio.play();
}
