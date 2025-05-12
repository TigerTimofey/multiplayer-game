import state from "../../state.js";
export function resetToMainMenu() {
  const leaveButton = document.querySelector(".leave-room-btn");
  leaveButton.className = "back-button hidden";
  leaveButton.textContent = "←";

  document.querySelector("#lobby-title").textContent =
    "Welcome to Treasure Hunters Arena";

  state.setCurrentRoomCode(null);

  document.querySelector("#lobby-title").classList.remove("hidden");
  document.querySelector(".lobby-buttons").classList.remove("hidden");
  document.querySelector("#game-lobby").classList.add("hidden");
  document.querySelector("#toggle-joke").classList.remove("hidden");

  document.querySelector("#lobby-players-list").innerHTML = "";
}
