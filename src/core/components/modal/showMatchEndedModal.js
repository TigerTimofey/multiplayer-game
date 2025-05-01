import state from "../../state.js";
import { resetToMainMenu } from "../../game/lobby/resetToMainMenu.js";

export function showMatchEndedModal(topKillsPlayer, topCoinsPlayer) {
  const gameOverAudio = new Audio("./assets/audio/gameOver.mp3");
  gameOverAudio.play();

  const matchEndedModal = document.createElement("div");
  matchEndedModal.className = "modal";
  matchEndedModal.innerHTML = `
    <div class="modal-content">
      <h2>MATCH ENDED</h2>
      <div class="stats-container">
        <div class="stat-item">
          <div class="stat-label">Top Kills</div>
          <div class="stat-value">${topKillsPlayer.name} (${topKillsPlayer.kills})</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Top Coins</div>
          <div class="stat-value">${topCoinsPlayer.name} (${topCoinsPlayer.coins})</div>
        </div>
      </div>
      <button id="close-match-ended-modal">Go to lobby</button>
    </div>
  `;

  document.body.appendChild(matchEndedModal);

  const closeButton = matchEndedModal.querySelector("#close-match-ended-modal");
  closeButton.addEventListener("click", () => {
    resetToMainMenu();
    matchEndedModal.remove();
    location.reload();
  });
}
