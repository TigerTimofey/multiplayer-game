export function showGameOver(eliminatedBy, playerStats, gameOverModal) {
  gameOverModal.classList.remove("hidden");

  const eliminatedByEl = document.querySelector("#eliminated-by");
  eliminatedByEl.textContent = `Eliminated by ${eliminatedBy.name} who had ${eliminatedBy.coins} coins!`;
}
