export function showGameOver(eliminatedBy, playerStats) {
  gameOverModal.classList.remove("hidden");

  const eliminatedByEl = document.querySelector("#eliminated-by");
  eliminatedByEl.textContent = `Eliminated by ${eliminatedBy.name} who had ${eliminatedBy.coins} coins!`;

  document.querySelector("#final-coins").textContent = playerStats.coins;

  const allPlayers = Object.values(players);
  const rank =
    allPlayers
      .sort((a, b) => b.coins - a.coins)
      .findIndex((p) => p.id === playerId) + 1;
  document.querySelector("#final-rank").textContent = `#${rank}`;
}
