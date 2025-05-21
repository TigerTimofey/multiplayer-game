/**
 * Utility function to display game messages with consistent formatting
 * @param {string} message - The message to display
 */
export function showGameMessage(message) {
  const oldMultiMessages = document.querySelectorAll(".message");
  oldMultiMessages.forEach((el) => el.remove());

  let messageElement = document.querySelector(".message");

  if (!messageElement) {
    messageElement = document.createElement("div");
    messageElement.className = "message";
    document.body.appendChild(messageElement);
  }

  setTimeout(() => {
    messageElement.style.display = "none";
  }, 3000);
}
