import { resetToMainMenu } from "../../game/lobby/resetToMainMenu.js";
import state from "../../state.js"; // Add this import

export function showMatchEndedModal(topKillsPlayer, topCoinsPlayer) {
  const gameOverAudio = new Audio("./assets/audio/gameOver.mp3");
  gameOverAudio.play();

  // Get room data to check for winner
  firebase
    .database()
    .ref(`rooms/${state.getCurrentRoomCode()}`)
    .once("value")
    .then((snapshot) => {
      const roomData = snapshot.val();
      const winner = roomData.winner;

      const matchEndedModal = document.createElement("div");
      matchEndedModal.className = "modal";

      matchEndedModal.innerHTML = `
        <div class="modal-content">
          <h2>MATCH ENDED</h2>
          ${
            winner
              ? `
            <div class="winner-announcement" style="color: white; margin: 20px 0; font-size: 1.2em; font-weight: bold;">
              ${winner.name} Won!
              <div style="font-size: 0.8em">First to fill their treasure box!</div>
            </div>
          `
              : ""
          }
          <div class="stats-container">
            <div class="stat-item">
              <div class="stat-label">Top Kills</div>
              <div class="stat-value">${topKillsPlayer.name} (${
        topKillsPlayer.kills
      })</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Top Coins</div>
              <div class="stat-value">${topCoinsPlayer.name} (${
        topCoinsPlayer.coins
      })</div>
            </div>
          </div>
          <button id="close-match-ended-modal">Go to lobby</button>
        </div>
      `;

      document.body.appendChild(matchEndedModal);

      const closeButton = matchEndedModal.querySelector(
        "#close-match-ended-modal"
      );
      closeButton.addEventListener("click", () => {
        resetToMainMenu();
        matchEndedModal.remove();
        location.reload();
      });
    });
}
