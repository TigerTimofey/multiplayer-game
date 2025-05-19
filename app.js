import { playerColors } from "./src/core/constants/palyerColors.js";
import { handleRestart } from "./src/core/game/game-process/handleRestart.js";
import { domElements } from "./src/utils/domElements.js";
import state from "./src/core/state.js";

import { initializeLobby } from "./src/core/game/lobby/initializeLobby.js";
import { cleanupPlayer } from "./src/core/game/lobby/cleanupPlayer.js";

// Import the state manager
import StateLocal from "./stateLocal.js";

(function () {
  const lobbyAudio = new Audio("./assets/audio/lobbybg.mp3");
  lobbyAudio.loop = true;

  document.addEventListener(
    "click",
    () => {
      if (lobbyAudio.paused) {
        lobbyAudio.play();
      }
    },
    { once: true }
  );

  document.addEventListener("click", (event) => {
    if (event.target.tagName === "BUTTON") {
      const clickAudio = new Audio("./assets/audio/click.mp3");
      clickAudio.play();
    }
  });

  domElements.restartButton.addEventListener("click", () => {
    handleRestart(
      state.getPlayerRef(),
      state.getPlayerId(),
      state.getSavedPlayerName(),
      playerColors
    );
  });

  document.querySelector("#start-game-btn").addEventListener("click", () => {
    const audio = new Audio("./assets/audio/gameStart.mp3");
    setTimeout(() => {
      audio.play();
      lobbyAudio.pause();
    }, 2500);

    const roomCode = document.querySelector("#room-code-display").textContent;
    const roomRef = firebase.database().ref(`rooms/${roomCode}`);

    roomRef.once("value").then((snapshot) => {
      const roomData = snapshot.val();
      if (
        !roomData.gameStarted &&
        roomData.currentPlayers === roomData.maxPlayers
      ) {
        roomRef.update({
          countdownStarted: Date.now(),
        });
      }
    });
  });

  window.addEventListener("beforeunload", () => {
    cleanupPlayer();
  });

  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      state.setPlayerId(user.uid);
      state.setPlayerRef(
        firebase.database().ref(`players/${state.getPlayerId()}`)
      );
      document.querySelector("#game-content").classList.add("hidden");
      state.getPlayerRef().onDisconnect().remove();
      initializeLobby();
    }
  });

  firebase
    .auth()
    .signInAnonymously()
    .catch((error) => {
      var errorCode = error.code;
      var errorMessage = error.message;
      console.log(errorCode, errorMessage);
    });

  document.querySelectorAll(".time-select button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".time-select button")
        .forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
    });
  });

  firebase
    .database()
    .ref("players")
    .on("child_changed", (snapshot) => {
      const playerId = snapshot.key;
      const effects = snapshot.val().effects || {};

      const playerElement = state.getPlayerElements()[playerId];
      if (!playerElement) return;

      if (effects.invisible) {
        if (playerId === state.getPlayerId()) {
          playerElement.style.opacity = "0.2";
        } else {
          playerElement.style.visibility = "hidden";
        }
      } else {
        playerElement.style.visibility = "visible";
        playerElement.style.opacity = "1";
      }

      if (effects.shield) {
        playerElement.classList.add("shield");
        const sprite = playerElement.querySelector(".Character_sprite");
        if (sprite) {
          sprite.style.filter = "brightness(1.2) hue-rotate(180deg)";
        }
      } else {
        playerElement.classList.remove("shield");
        const sprite = playerElement.querySelector(".Character_sprite");
        if (sprite) {
          sprite.style.filter = "";
        }
      }

      if (effects.ultimate) {
        playerElement.classList.add("dragon");
        const sprite = playerElement.querySelector(".Character_sprite");
        if (sprite) {
          sprite.style.filter =
            "brightness(1.5) saturate(2) hue-rotate(360deg)";
        }
      } else {
        playerElement.classList.remove("dragon");
        const sprite = playerElement.querySelector(".Character_sprite");
        if (sprite) {
          sprite.style.filter = "";
        }
      }

      if (effects.grow) {
        playerElement.classList.add("giant");
        playerElement.style.transform = `translate3d(${
          16 * snapshot.val().x
        }px, ${16 * snapshot.val().y - 4}px, 0) scale(2)`;
      } else {
        playerElement.classList.remove("giant");
        playerElement.style.transform = `translate3d(${
          16 * snapshot.val().x
        }px, ${16 * snapshot.val().y - 4}px, 0) scale(1)`;
      }

      if (effects.speed) {
        playerElement.classList.add("speed-boost");
      } else {
        playerElement.classList.remove("speed-boost");
      }
    });

  // Handle Single Player button click
  document.getElementById("single-player").addEventListener("click", () => {
    // Hide the main menu buttons
    document.querySelector(".lobby-buttons").classList.add("hidden");

    // Hide the settings button
    document.getElementById("toggle-joke").classList.add("hidden");

    // Show the initial setup for name and color
    document.getElementById("initial-setup").classList.remove("hidden");

    // Update the title
    document.getElementById("lobby-title").textContent = "Single Player Setup";

    // Show back button
    document.querySelector(".back-button").classList.remove("hidden");

    // Try to load previous player info
    const playerInfo = StateLocal.getPlayerInfo();

    // Pre-fill name if available
    if (playerInfo.name) {
      document.getElementById("lobby-name").value = playerInfo.name;
    }

    // Populate color options if not already done
    const colorOptions = document.querySelector(".color-options");
    if (colorOptions.children.length === 0) {
      const colors = ["red", "blue", "green", "yellow", "purple", "orange"];
      colors.forEach((color) => {
        const colorOption = document.createElement("div");
        colorOption.classList.add("color-option");
        colorOption.style.backgroundColor = color;
        colorOption.dataset.color = color;

        // Select this color if it matches saved color
        if (color === playerInfo.color) {
          colorOption.classList.add("selected");
        }

        colorOption.addEventListener("click", () => {
          // Remove selected class from all options
          document.querySelectorAll(".color-option").forEach((opt) => {
            opt.classList.remove("selected");
          });
          // Add selected class to clicked option
          colorOption.classList.add("selected");
        });

        colorOptions.appendChild(colorOption);
      });
    }
  });

  // Make sure bot selection is hidden initially
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("bot-selection").classList.add("hidden");
  });

  // Hide bot selection when other buttons are clicked
  document.getElementById("create-room").addEventListener("click", () => {
    document.getElementById("bot-selection").classList.add("hidden");
  });

  document.getElementById("join-room").addEventListener("click", () => {
    document.getElementById("bot-selection").classList.add("hidden");
  });

  // Handle the continue button in single player setup
  document.getElementById("continue-setup").addEventListener("click", () => {
    const playerName = document.getElementById("lobby-name").value.trim();
    const selectedColor = document.querySelector(".color-option.selected")
      ?.dataset.color;

    // Validate inputs
    if (!playerName) {
      alert("Please enter your name");
      return;
    }

    if (!selectedColor) {
      alert("Please select a color");
      return;
    }

    // Save player information
    StateLocal.setPlayerInfo(playerName, selectedColor);

    // Only show bot selection if we came from single player
    if (
      document.getElementById("lobby-title").textContent ===
      "Single Player Setup"
    ) {
      // Hide the initial setup form
      document.getElementById("initial-setup").classList.add("hidden");

      // Show the bot selection UI
      document.getElementById("bot-selection").classList.remove("hidden");

      // Update the title
      document.getElementById("lobby-title").textContent = "Select Bots";
    }
  });

  // Handle bot selection
  document
    .querySelectorAll("#bot-selection .player-select button")
    .forEach((button) => {
      button.addEventListener("click", () => {
        // Remove selected class from all buttons
        document
          .querySelectorAll("#bot-selection .player-select button")
          .forEach((btn) => {
            btn.classList.remove("selected");
          });

        // Add selected class to clicked button
        button.classList.add("selected");

        // Store bot count in StateLocal
        const botCount = parseInt(button.dataset.bots);
        StateLocal.setGameSettings(botCount, "classic", 120); // Default values for gameMode and roundTime
      });
    });

  // Handle start single player game button
  document.getElementById("start-single-game").addEventListener("click", () => {
    const selectedBot = document.querySelector(
      "#bot-selection .player-select button.selected"
    );

    if (!selectedBot) {
      alert("Please select number of bots");
      return;
    }

    const botCount = parseInt(selectedBot.dataset.bots);
    const playerInfo = StateLocal.getPlayerInfo();

    console.log("Starting single player game with:", {
      player: playerInfo,
      bots: botCount,
      settings: StateLocal.getGameSettings(),
    });

    // Here you would start the single player game
    // For now, just log the information
  });

  // Handle back button
  document.querySelector(".back-button").addEventListener("click", () => {
    // Hide setup screens
    document.getElementById("initial-setup").classList.add("hidden");
    document.getElementById("bot-selection").classList.add("hidden");

    // Show main menu buttons
    document.querySelector(".lobby-buttons").classList.remove("hidden");

    // Show the settings button again
    document.getElementById("toggle-joke").classList.remove("hidden");

    // Hide back button
    document.querySelector(".back-button").classList.add("hidden");

    // Reset title
    document.getElementById("lobby-title").textContent =
      "Welcome to Treasure Hunters Arena";
  });
})();
