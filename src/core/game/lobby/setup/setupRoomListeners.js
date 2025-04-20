import { startCountdown } from "../../../components/counter/startCountdown.js";
import state from "../../../state.js";

export function setupRoomListeners(roomRef) {
  roomRef.on("value", (snapshot) => {
    const roomData = snapshot.val();
    if (!roomData) return;

    const playersList = document.querySelector("#lobby-players-list");
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

        const readyStatus = player.isReady ? "Is Ready" : "Not Ready";
        const statusClass = player.isReady
          ? "status-ready"
          : "status-not-ready";

        const statusHtml =
          id === state.getPlayerId()
            ? `<button class="player-status ${statusClass}">${readyStatus}</button>`
            : `<div class="player-status-display ${statusClass}">${readyStatus}</div>`;

        playerEl.innerHTML = `
            <div class="player-name">${player.name} ${
          player.isHost ? "(Host)" : ""
        }</div>
            ${statusHtml}
          `;

        if (id === state.getPlayerId()) {
          const statusBtn = playerEl.querySelector(".player-status");
          statusBtn.title = "Click to toggle ready status";
          statusBtn.addEventListener("click", () => {
            const playerRef = roomRef.child(`players/${state.getPlayerId()}`);
            playerRef.update({
              isReady: !player.isReady,
            });
          });
        }

        playersList.appendChild(playerEl);
      });

      const startButton = document.querySelector("#start-game-btn");
      const allPlayersReady = Object.values(roomData.players).every(
        (p) => p.isReady
      );

      startButton.disabled = !allPlayersReady;
      if (allPlayersReady) {
        startButton.title = "All players ready - Click to start!";
      } else {
        startButton.title = "Waiting for all players to be ready";
      }

      startButton.style.opacity = "1";
    }

    const startButton = document.querySelector("#start-game-btn");
    if (state.getPlayerId() === roomData.hostId) {
      startButton.classList.add("host");
    } else {
      startButton.classList.remove("host");
    }

    // Only start countdown if game hasn't started yet
    if (
      roomData.countdownStarted &&
      !roomData.gameStarted &&
      !window.countdownTriggered
    ) {
      window.countdownTriggered = true;
      startCountdown(roomRef);
    }
  });
}
