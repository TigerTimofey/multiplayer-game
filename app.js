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

    // Clear any previous nickname in the input field
    document.getElementById("lobby-name").value = "";

    // Populate color options if not already done
    const colorOptions = document.querySelector(".color-options");
    if (colorOptions.children.length === 0) {
      const colors = ["red", "blue", "green", "yellow", "purple", "orange"];
      colors.forEach((color) => {
        const colorOption = document.createElement("div");
        colorOption.classList.add("color-option");
        colorOption.style.backgroundColor = color;
        colorOption.dataset.color = color;

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
    } else {
      // Clear all selected colors
      document.querySelectorAll(".color-option").forEach((opt) => {
        opt.classList.remove("selected");
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

  // Helper function to show tooltips instead of alerts - modified to position tooltip correctly
  function showTooltip(message, duration = 3000, targetElement = null) {
    // Check if a tooltip already exists
    let tooltip = document.querySelector(".tooltip");

    // If not, create one
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.className = "tooltip";
      document.body.appendChild(tooltip);
    }

    // Set the message
    tooltip.textContent = message;

    // Position the tooltip based on target element or default to center
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      tooltip.style.top = rect.top - 10 + "px"; // Position above the element
      tooltip.style.left = rect.left + rect.width / 2 + "px";
    } else {
      tooltip.style.top = "50%";
      tooltip.style.left = "50%";
    }

    // Make sure the tooltip is not being animated out
    tooltip.classList.remove("fade-out");

    // Show the tooltip (adding class triggers animation)
    tooltip.style.display = "block";

    // Add the fade-out class after duration
    setTimeout(() => {
      tooltip.classList.add("fade-out");

      // After animation completes, hide tooltip
      setTimeout(() => {
        tooltip.style.display = "none";
      }, 300); // Match the CSS animation duration
    }, duration);
  }

  // Handle the continue button in single player setup
  document.getElementById("continue-setup").addEventListener("click", () => {
    const playerName = document.getElementById("lobby-name").value.trim();
    const selectedColor = document.querySelector(".color-option.selected")
      ?.dataset.color;

    // Validate inputs
    if (!playerName) {
      // showTooltip("Please enter your name");
      return;
    }

    if (!selectedColor) {
      // showTooltip("Please select a color");
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

      // Hide difficulty selection until bot count is selected
      document.getElementById("difficulty-selection").classList.add("hidden");

      // Show the start single game button which will now proceed to difficulty selection
      document.getElementById("start-single-game").classList.remove("hidden");

      // Update the title
      document.getElementById("lobby-title").textContent = "Select Bots";
    }
  });

  // Handle bot selection - modified to match room creation flow
  document
    .querySelectorAll("#bot-selection .player-select button")
    .forEach((button) => {
      button.addEventListener("click", () => {
        // Remove selected class from all buttons in bot selection
        document
          .querySelectorAll("#bot-selection .player-select button")
          .forEach((btn) => {
            btn.classList.remove("selected");
          });

        // Add selected class to clicked button
        button.classList.add("selected");

        // Store bot count in StateLocal when a bot count is selected
        const botCount = parseInt(button.dataset.bots);

        // Preserve difficulty if it was already selected
        const selectedDifficulty = document.querySelector(
          "#difficulty-selection .player-select button.selected"
        );
        const difficulty = selectedDifficulty
          ? selectedDifficulty.dataset.modeBots
          : "";

        StateLocal.setGameSettings(botCount, "classic", 120, difficulty);
      });
    });

  // Handle the start single game button to proceed to difficulty selection
  document.getElementById("start-single-game").addEventListener("click", () => {
    const selectedBot = document.querySelector(
      "#bot-selection .player-select button.selected"
    );

    if (!selectedBot) {
      // Position tooltip above the bot selection buttons
      const playerSelectElement = document.querySelector(
        "#bot-selection .player-select"
      );
      showTooltip("Please select number of bots", 3000, playerSelectElement);
      return;
    }

    // Hide bot selection now
    document.getElementById("bot-selection").classList.add("hidden");

    // Show difficulty selection
    document.getElementById("difficulty-selection").classList.remove("hidden");

    // Update title
    document.getElementById("lobby-title").textContent = "Select Difficulty";
  });

  // Handle difficulty selection - simpler now that we're in a sequential flow
  document
    .querySelectorAll("#difficulty-selection .player-select button")
    .forEach((button) => {
      button.addEventListener("click", () => {
        // Remove selected class from all buttons in difficulty selection only
        document
          .querySelectorAll("#difficulty-selection .player-select button")
          .forEach((btn) => {
            btn.classList.remove("selected");
          });

        // Add selected class to clicked button
        button.classList.add("selected");

        // Get bot count and update settings
        const gameSettings = StateLocal.getGameSettings();
        const difficulty = button.dataset.modeBots;
        StateLocal.setBotDifficulty(difficulty);
      });
    });

  // Handle the final start button after difficulty selection - now continues to time selection
  document
    .getElementById("start-difficulty-game")
    .addEventListener("click", () => {
      const selectedDifficulty = document.querySelector(
        "#difficulty-selection .player-select button.selected"
      );

      if (!selectedDifficulty) {
        // Position tooltip above the difficulty selection buttons
        const difficultySelectElement = document.querySelector(
          "#difficulty-selection .player-select"
        );
        showTooltip(
          "Please select a difficulty level",
          3000,
          difficultySelectElement
        );
        return;
      }

      // Store the selected difficulty
      const difficulty = selectedDifficulty.dataset.modeBots;
      StateLocal.setBotDifficulty(difficulty);

      // Hide difficulty selection
      document.getElementById("difficulty-selection").classList.add("hidden");

      // Show time selection
      document.getElementById("time-selection").classList.remove("hidden");

      // Update title
      document.getElementById("lobby-title").textContent = "Select Round Time";
    });

  // Handle time selection buttons
  document
    .querySelectorAll("#time-selection .time-select button")
    .forEach((button) => {
      button.addEventListener("click", () => {
        // Remove selected class from all buttons
        document
          .querySelectorAll("#time-selection .time-select button")
          .forEach((btn) => {
            btn.classList.remove("selected");
          });

        // Add selected class to clicked button
        button.classList.add("selected");

        // Store the selected time in game settings
        const roundTime = parseInt(button.dataset.time);
        const gameSettings = StateLocal.getGameSettings();

        // Update just the roundTime property, preserving other settings
        StateLocal.setGameSettings(
          gameSettings.botCount,
          gameSettings.gameMode,
          roundTime,
          gameSettings.botDifficulty
        );
      });
    });

  // Handle the final start button after time selection
  document.getElementById("start-game-final").addEventListener("click", () => {
    const selectedTime = document.querySelector(
      "#time-selection .time-select button.selected"
    );

    if (!selectedTime) {
      // Position tooltip above the time selection buttons
      const timeSelectElement = document.querySelector(
        "#time-selection .time-select"
      );
      showTooltip("Please select a round time", 3000, timeSelectElement);
      return;
    }

    const gameSettings = StateLocal.getGameSettings();
    const playerInfo = StateLocal.getPlayerInfo();

    // Generate bot data
    const botCount = gameSettings.botCount;
    const botDifficulty = gameSettings.botDifficulty;

    // Generate bots with different colors
    const bots = generateBots(botCount, botDifficulty, playerInfo.color);

    // Store bots in the state
    StateLocal.storeBots(bots);

    // Hide time selection screen
    document.getElementById("time-selection").classList.add("hidden");

    // Display the single player lobby with bots
    showSinglePlayerLobby(playerInfo, bots, gameSettings);
  });

  // Function to show single player lobby with bots
  function showSinglePlayerLobby(player, bots, gameSettings) {
    // Update the title
    document.getElementById("lobby-title").textContent = "Single Player Lobby";

    // Create or get the single player lobby container
    let singleLobbyContainer = document.getElementById("sp-game-lobby");
    if (!singleLobbyContainer) {
      singleLobbyContainer = document.createElement("div");
      singleLobbyContainer.id = "sp-game-lobby";
      singleLobbyContainer.className = "game-lobby";
      document
        .getElementById("regular-content")
        .appendChild(singleLobbyContainer);
    }

    // Clear any existing content
    singleLobbyContainer.innerHTML = "";

    // Create lobby header with game info
    const lobbyHeader = document.createElement("div");
    lobbyHeader.className = "lobby-header";
    lobbyHeader.innerHTML = `
      <div class="room-capacity">
        Mode: ${gameSettings.gameMode || "Classic"} </br></br> 
        Time: ${gameSettings.roundTime / 60} min </br></br>  
        Difficulty: ${gameSettings.botDifficulty}
      </div>
    `;
    singleLobbyContainer.appendChild(lobbyHeader);

    // Create players list container
    const playersContainer = document.createElement("div");
    playersContainer.className = "lobby-players";

    // Add the player list header
    const playersListHeader = document.createElement("h3");
    playersListHeader.textContent = "Players";
    playersContainer.appendChild(playersListHeader);

    // Create the player list
    const playersList = document.createElement("div");
    playersList.id = "sp-lobby-players-list";
    playersContainer.appendChild(playersList);

    // Add the human player (always set as ready)
    const playerElement = createPlayerElement(player, true, true);
    playersList.appendChild(playerElement);

    // Add the bots (randomly set as ready/not ready for visual effect)
    bots.forEach((bot, index) => {
      // Stagger the "ready" status of bots to make it look more realistic
      const isReady = Math.random() > 0.5;
      const botElement = createPlayerElement(bot, false, isReady);

      // Store the ready status in the bot object
      bot.isReady = isReady;

      // Add small delay to simulate bots joining
      setTimeout(() => {
        playersList.appendChild(botElement);

        // After a random time, set bot to ready if not already
        if (!isReady) {
          setTimeout(() => {
            bot.isReady = true;
            botElement
              .querySelector(".status-not-ready")
              .classList.remove("status-not-ready");
            botElement
              .querySelector(".player-status-display")
              .classList.add("status-ready");
            botElement.querySelector(".player-status-display").textContent =
              "Ready";

            // Check if all bots are ready
            checkAllReady();
          }, 1000 + Math.random() * 5000);
        }
      }, 500 * index);
    });

    singleLobbyContainer.appendChild(playersContainer);

    // Add start game button
    const startButton = document.createElement("button");
    startButton.id = "sp-start-game-btn";
    startButton.className = "lobby-button";
    startButton.textContent = "Start Game";
    startButton.disabled = true; // Disabled until all bots are ready

    startButton.addEventListener("click", () => {
      // Start the single player game
      startSinglePlayerGame(player, bots, gameSettings);
    });

    singleLobbyContainer.appendChild(startButton);

    // Show the lobby
    singleLobbyContainer.classList.remove("hidden");

    // Function to check if all bots are ready
    function checkAllReady() {
      const allReady = bots.every((bot) => bot.isReady);

      if (allReady) {
        startButton.disabled = false;
        startButton.textContent = "Start Game";
        startButton.classList.add("all-ready");
      }
    }

    // Check initially in case all bots are already ready
    checkAllReady();
  }

  // Helper function to create a player element for the lobby
  function createPlayerElement(player, isHuman, isReady) {
    const playerElement = document.createElement("div");
    playerElement.className = "lobby-player";
    playerElement.style.borderLeft = `4px solid ${player.color}`;

    const playerName = document.createElement("div");
    playerName.className = "player-name";

    // Add a crown icon for the human player
    playerName.innerHTML = `${isHuman ? "👑 " : ""}${player.name} ${
      player.isBot ? "(Bot)" : ""
    }`;

    playerElement.appendChild(playerName);

    // Add status indicator
    const playerStatus = document.createElement("div");
    playerStatus.className = `player-status-display ${
      isReady ? "status-ready" : "status-not-ready"
    }`;
    playerStatus.textContent = isReady ? "Ready" : "Not Ready";

    playerElement.appendChild(playerStatus);

    // Add animation for just joined
    playerElement.classList.add("player-joined");
    setTimeout(() => {
      playerElement.classList.remove("player-joined");
    }, 500);

    return playerElement;
  }

  // Function to start the single player game
  function startSinglePlayerGame(player, bots, gameSettings) {
    console.log("Starting game with:", { player, bots, gameSettings });

    // Add transition effect
    const lobby = document.getElementById("sp-game-lobby");
    lobby.style.animation = "fadeOut 0.5s forwards";

    // Simulate countdown
    const countdownOverlay = document.createElement("div");
    countdownOverlay.className = "countdown-overlay";
    document.body.appendChild(countdownOverlay);

    // Play start sound
    const audio = new Audio("./assets/audio/gameStart.mp3");

    let count = 3;
    countdownOverlay.innerHTML = `<div class="countdown-number">${count}</div>`;

    const interval = setInterval(() => {
      count--;

      if (count > 0) {
        countdownOverlay.innerHTML = `<div class="countdown-number">${count}</div>`;
      } else {
        clearInterval(interval);
        countdownOverlay.innerHTML = `<div class="countdown-number">GO!</div>`;

        // Play game start sound
        audio.play();

        // After countdown, start the actual game
        setTimeout(() => {
          document.querySelector("#lobby").classList.add("hidden");
          document.querySelector("#game-content").classList.remove("hidden");
          countdownOverlay.remove();

          // Initialize the single player game with player and bots
          import("./src/core/game/singlePlayer/initSinglePlayerGame.js")
            .then((module) => {
              const cleanupGame = module.initSinglePlayerGame(
                player,
                bots,
                gameSettings
              );

              // Add event listener for the quit button
              document
                .getElementById("quit-button")
                .addEventListener("click", () => {
                  cleanupGame();
                  document
                    .querySelector("#game-content")
                    .classList.add("hidden");
                  document.querySelector("#lobby").classList.remove("hidden");
                  document
                    .getElementById("options-modal")
                    .classList.add("hidden");
                });
            })
            .catch((error) => {
              console.error("Error loading single player game:", error);
            });
        }, 1000);
      }
    }, 1000);
  }

  // Update back button handler to include the single player lobby
  document.querySelector(".back-button").addEventListener("click", () => {
    // Check which screen is currently visible
    if (
      document.getElementById("sp-game-lobby") &&
      !document.getElementById("sp-game-lobby").classList.contains("hidden")
    ) {
      // If single player lobby is visible, go back to time selection
      document.getElementById("sp-game-lobby").classList.add("hidden");
      document.getElementById("time-selection").classList.remove("hidden");
      document.getElementById("lobby-title").textContent = "Select Round Time";
    } else if (
      !document.getElementById("time-selection").classList.contains("hidden")
    ) {
      // If time selection is visible, go back to difficulty selection
      document.getElementById("time-selection").classList.add("hidden");
      document
        .getElementById("difficulty-selection")
        .classList.remove("hidden");
      document.getElementById("lobby-title").textContent = "Select Difficulty";
    } else if (
      !document
        .getElementById("difficulty-selection")
        .classList.contains("hidden")
    ) {
      // If difficulty selection is visible, go back to bot selection
      document.getElementById("difficulty-selection").classList.add("hidden");
      document.getElementById("bot-selection").classList.remove("hidden");
      document.getElementById("lobby-title").textContent = "Select Bots";
    } else if (
      !document.getElementById("bot-selection").classList.contains("hidden")
    ) {
      // If bot selection is visible, go back to initial setup
      document.getElementById("bot-selection").classList.add("hidden");
      document.getElementById("initial-setup").classList.remove("hidden");
      document.getElementById("lobby-title").textContent =
        "Single Player Setup";
    } else {
      // Otherwise, go back to main menu
      document.getElementById("initial-setup").classList.add("hidden");
      document.getElementById("bot-selection").classList.add("hidden");
      document.getElementById("difficulty-selection").classList.add("hidden");
      document.getElementById("time-selection").classList.add("hidden");
      document.querySelector(".lobby-buttons").classList.remove("hidden");
      document.getElementById("toggle-joke").classList.remove("hidden");
      document.querySelector(".back-button").classList.add("hidden");
      document.getElementById("lobby-title").textContent =
        "Welcome to Treasure Hunters Arena";
    }
  });

  // Function to generate bot data
  function generateBots(count, difficulty, playerColor) {
    const botNames = [
      "Bot Alpha",
      "Bot Beta",
      "Bot Gamma",
      "Bot Delta",
      "Bot Epsilon",
    ];
    const availableColors = playerColors.filter(
      (color) => color !== playerColor
    );
    const bots = [];

    for (let i = 0; i < count; i++) {
      // Rotate through available colors for bots
      const botColor = availableColors[i % availableColors.length];

      // Create a bot with a name based on its color
      const colorName = botColor.charAt(0).toUpperCase() + botColor.slice(1);
      const botName = `${colorName} ${botNames[i % botNames.length]}`;

      bots.push({
        name: botName,
        color: botColor,
        difficulty: difficulty,
        coins: 0,
        kills: 0,
        isBot: true,
      });
    }

    return bots;
  }
})();
