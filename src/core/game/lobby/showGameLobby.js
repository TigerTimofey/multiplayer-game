import { setupPlayerCleanup } from "./setup/setupPlayerCleanup.js";
import { setupRoomListeners } from "./setup/setupRoomListeners.js";
import { resetToMainMenu } from "./resetToMainMenu.js";
import { handlePlayerLeave } from "./handlePlayerLeave.js";
import { showTooltip } from "../../components/tooltip/tooltip.js";

import state from "../../state.js";

export function showGameLobby(roomCode) {
  state.setCurrentRoomCode(roomCode);
  document.querySelector("#room-creation").classList.add("hidden");
  document.querySelector("#room-join").classList.add("hidden");
  document.querySelector("#game-lobby").classList.remove("hidden");
  document.querySelector("#room-code-display").textContent = roomCode;
  document.querySelector("#toggle-joke").classList.add("hidden");
  document.querySelector("#lobby-title").classList.add("hidden");

  const roomCodeDisplay = document.querySelector("#room-code-display");
  roomCodeDisplay.style.cursor = "pointer";
  roomCodeDisplay.title = "Click to copy";
  roomCodeDisplay.addEventListener("click", () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      showTooltip(roomCodeDisplay, "Code copied!");
    });
  });

  const backButton = document.querySelector(".back-button");
  backButton.className = "leave-room-btn";
  backButton.textContent = "Leave Room";
  backButton.onclick = () => {
    const roomRef = firebase.database().ref(`rooms/${roomCode}`);

    roomRef.once("value", (snapshot) => {
      const roomData = snapshot.val();
      const isHost = roomData.hostId === state.getPlayerId();

      if (isHost) {
        roomRef.remove().then(() => {
          handlePlayerLeave(roomCode);
          window.location.reload();
        });
      } else {
        handlePlayerLeave(roomCode);
        window.location.reload();
      }
    });
  };

  setupPlayerCleanup(roomCode);
  const roomRef = firebase.database().ref(`rooms/${roomCode}`);
  setupRoomListeners(roomRef);
}
