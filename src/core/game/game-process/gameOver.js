export function showGameOver(eliminatedBy, playerStats, gameOverModal) {
  gameOverModal.classList.remove("hidden");

  const eliminatedByEl = document.querySelector("#eliminated-by");
  eliminatedByEl.textContent = `Eliminated by ${eliminatedBy.name} who had ${eliminatedBy.coins} coins!`;

  const audio = new Audio("../../../../assets/audio/die.mp3");
  audio.play();
}
