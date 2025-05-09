import state from "../../state.js";

export function updateLobbyPlayers(players, roomRef) {
  const playersList = document.querySelector("#lobby-players-list");

  roomRef.on("value", (snapshot) => {
    const roomData = snapshot.val();
    if (!roomData) return;

    playersList.innerHTML = "";

    const capacityDiv = document.createElement("div");
    capacityDiv.className = "room-capacity";
    capacityDiv.textContent = `Players: ${roomData.currentPlayers}/${roomData.maxPlayers}`;
    playersList.appendChild(capacityDiv);

    if (roomData.players) {
      Object.entries(roomData.players).forEach(([id, player]) => {
        const playerEl = document.createElement("div");
        playerEl.className = "lobby-player";
        playerEl.style.color = player.color;

        const readyStatus = player.isReady ? "Ready" : "Not Ready";
        const statusClass = player.isReady
          ? "status-ready"
          : "status-not-ready";

        if (id === state.getPlayerId()) {
          playerEl.innerHTML = `
              <div class="player-name">${player.name} ${
            player.isHost ? "🌟" : ""
          }</div>
              <button class="player-status ${statusClass}">${readyStatus}</button>
            `;

          const statusBtn = playerEl.querySelector(".player-status");
          statusBtn.addEventListener("click", () => {
            const playerRef = roomRef.child(`players/${state.getPlayerId()}`);
            playerRef.update({
              isReady: !player.isReady,
            });
          });
        } else {
          playerEl.innerHTML = `
              <div class="player-name">${player.name} ${
            player.isHost ? "🌟" : ""
          }</div>
              <div class="player-status-display ${statusClass}">${readyStatus}</div>
            `;
        }

        playersList.appendChild(playerEl);
      });

      const startButton = document.querySelector("#start-game-btn");
      const allPlayersReady = Object.values(roomData.players).every(
        (p) => p.isReady
      );
      startButton.disabled = !allPlayersReady;
    }
  });
}
