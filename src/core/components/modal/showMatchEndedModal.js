import state from "../../state.js";
import { resetToMainMenu } from "../../game/lobby/resetToMainMenu.js";

export function showMatchEndedModal(topKillsPlayer, topCoinsPlayer) {
  const gameOverAudio = new Audio("./assets/audio/gameOver.mp3");
  gameOverAudio.play();

  const isKillsDraw =
    Object.values(state.getPlayers()).filter(
      (p) => p.kills === topKillsPlayer.kills
    ).length > 1;

  const isCoinsDraw =
    Object.values(state.getPlayers()).filter(
      (p) => p.coins === topCoinsPlayer.coins
    ).length > 1;

  const matchEndedModal = document.createElement("div");
  matchEndedModal.className = "modal";
  matchEndedModal.innerHTML = `
    <div class="modal-content">
      <h2>MATCH ENDED</h2>
      <div class="stats-container">
        <div class="stat-item">
          <div class="stat-label">Top Kills</div>
          <div class="stat-value">${
            isKillsDraw
              ? "Draw"
              : `${topKillsPlayer.name} (${topKillsPlayer.kills})`
          }</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Top Coins</div>
          <div class="stat-value">${
            isCoinsDraw
              ? "Draw"
              : `${topCoinsPlayer.name} (${topCoinsPlayer.coins})`
          }</div>
        </div>
      </div>
      <button id="close-match-ended-modal">Go to lobby</button>
    </div>
  `;

  document.body.appendChild(matchEndedModal);

  if (state.getPlayerRef()) {
    state.getPlayerRef().update({ frozen: true });
  }

  const closeButton = matchEndedModal.querySelector("#close-match-ended-modal");
  closeButton.addEventListener("click", () => {
    if (state.getPlayerRef()) {
      state
        .getPlayerRef()
        .remove()
        .then(() => {
          const roomRef = firebase
            .database()
            .ref(`rooms/${state.getCurrentRoomCode()}`);
          roomRef
            .remove()
            .then(() => {
              document.querySelector("#game-content").classList.add("hidden");
              document.querySelector("#lobby").classList.remove("hidden");
              resetToMainMenu();
              matchEndedModal.remove();

              location.reload();
            })
            .catch((error) => {
              console.error("Failed to remove room:", error);
            });
        });
    }
  });
}
