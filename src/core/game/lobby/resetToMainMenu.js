import state from "../../state.js";
export function resetToMainMenu() {
  // Reset UI elements
  const leaveButton = document.querySelector(".leave-room-btn");
  leaveButton.className = "back-button hidden";
  leaveButton.textContent = "←";

  // Reset title
  document.querySelector("#lobby-title").textContent =
    "Welcome to Multiplayer Game";

  // Reset room code
  state.setCurrentRoomCode(null);

  // Show main menu elements
  document.querySelector("#lobby-title").classList.remove("hidden");
  document.querySelector(".lobby-buttons").classList.remove("hidden");
  document.querySelector("#game-lobby").classList.add("hidden");
  document.querySelector("#toggle-joke").classList.remove("hidden");

  // Clear any existing game state
  document.querySelector("#lobby-players-list").innerHTML = "";
}
