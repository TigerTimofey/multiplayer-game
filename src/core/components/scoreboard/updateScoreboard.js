export function updateScoreboard(players, playerId) {
  const playersList = document.querySelector("#players-list");
  playersList.innerHTML = `
      <div class="scoreboard-header">
        <span>Name</span>
        <span>Coins</span>
        <span>Kills</span>
      </div>
    `;

  const sortedPlayers = Object.values(players).sort((a, b) => {
    if (b.coins !== a.coins) return b.coins - a.coins;
    return (b.kills || 0) - (a.kills || 0);
  });

  sortedPlayers.forEach((player) => {
    const div = document.createElement("div");
    div.classList.add("player-score");
    if (player.id === playerId) {
      div.classList.add("you");
    }
    div.innerHTML = `
        <span>${player.name}</span>
        <span>${player.coins}</span>
        <span>${player.kills || 0}</span>
      `;
    playersList.appendChild(div);
  });
}
