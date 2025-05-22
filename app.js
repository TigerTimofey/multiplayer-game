import { playerColors } from "./src/core/constants/palyerColors.js";
import { handleRestart } from "./src/core/game/game-process/handleRestart.js";
import { domElements } from "./src/utils/domElements.js";
import state from "./src/core/state.js";

import { initializeLobby } from "./src/core/game/lobby/initializeLobby.js";
import { cleanupPlayer } from "./src/core/game/lobby/cleanupPlayer.js";

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

  document.getElementById("single-player").addEventListener("click", () => {
    document.querySelector(".lobby-buttons").classList.add("hidden");

    document.getElementById("toggle-joke").classList.add("hidden");

    document.getElementById("initial-setup").classList.remove("hidden");

    document.getElementById("lobby-title").textContent = "Character name";

    document.querySelector(".back-button").classList.remove("hidden");

    document.getElementById("lobby-name").value = "";

    const colorOptions = document.querySelector(".color-options");
    if (colorOptions.children.length === 0) {
      const colors = ["red", "blue", "green", "yellow", "purple", "orange"];
      colors.forEach((color) => {
        const colorOption = document.createElement("div");
        colorOption.classList.add("color-option");
        colorOption.style.backgroundColor = color;
        colorOption.dataset.color = color;

        colorOption.addEventListener("click", () => {
          document.querySelectorAll(".color-option").forEach((opt) => {
            opt.classList.remove("selected");
          });
          colorOption.classList.add("selected");
        });

        colorOptions.appendChild(colorOption);
      });
    } else {
      document.querySelectorAll(".color-option").forEach((opt) => {
        opt.classList.remove("selected");
      });
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("bot-selection").classList.add("hidden");
  });

  document.getElementById("create-room").addEventListener("click", () => {
    document.getElementById("bot-selection").classList.add("hidden");
  });

  document.getElementById("join-room").addEventListener("click", () => {
    document.getElementById("bot-selection").classList.add("hidden");
  });

  function showTooltip(message, duration = 3000, targetElement = null) {
    let tooltip = document.querySelector(".tooltip");

    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.className = "tooltip";
      document.body.appendChild(tooltip);
    }

    tooltip.textContent = message;

    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      tooltip.style.top = rect.top - 10 + "px";
      tooltip.style.left = rect.left + rect.width / 2 + "px";
    } else {
      tooltip.style.top = "50%";
      tooltip.style.left = "50%";
    }

    tooltip.classList.remove("fade-out");

    tooltip.style.display = "block";

    setTimeout(() => {
      tooltip.classList.add("fade-out");

      setTimeout(() => {
        tooltip.style.display = "none";
      }, 300);
    }, duration);
  }

  document.getElementById("continue-setup").addEventListener("click", () => {
    const playerName = document.getElementById("lobby-name").value.trim();
    const selectedColor = document.querySelector(".color-option.selected")
      ?.dataset.color;

    if (!playerName) {
      return;
    }

    if (!selectedColor) {
      return;
    }

    StateLocal.setPlayerInfo(playerName, selectedColor);

    if (
      document.getElementById("lobby-title").textContent === "Character name"
    ) {
      document.getElementById("initial-setup").classList.add("hidden");

      document.getElementById("bot-selection").classList.remove("hidden");

      document.getElementById("difficulty-selection").classList.add("hidden");

      document.getElementById("start-single-game").classList.remove("hidden");

      document.getElementById("lobby-title").textContent = "Select Bots";
    }
  });

  document
    .querySelectorAll("#bot-selection .player-select button")
    .forEach((button) => {
      button.addEventListener("click", () => {
        document
          .querySelectorAll("#bot-selection .player-select button")
          .forEach((btn) => {
            btn.classList.remove("selected");
          });

        button.classList.add("selected");

        const botCount = parseInt(button.dataset.bots);

        const selectedDifficulty = document.querySelector(
          "#difficulty-selection .player-select button.selected"
        );
        const difficulty = selectedDifficulty
          ? selectedDifficulty.dataset.modeBots
          : "";

        StateLocal.setGameSettings(botCount, "classic", 120, difficulty);
      });
    });

  document.getElementById("start-single-game").addEventListener("click", () => {
    const selectedBot = document.querySelector(
      "#bot-selection .player-select button.selected"
    );

    if (!selectedBot) {
      const playerSelectElement = document.querySelector(
        "#bot-selection .player-select"
      );
      showTooltip("Please select number of bots", 3000, playerSelectElement);
      return;
    }

    document.getElementById("bot-selection").classList.add("hidden");

    document.getElementById("bot-customization").classList.remove("hidden");

    document.getElementById("lobby-title").textContent = "Customize Bots";

    const botCount = parseInt(selectedBot.dataset.bots);
    const playerColor = StateLocal.getPlayerInfo().color;
    createBotCustomizationSlots(botCount, playerColor);
  });

  function createBotCustomizationSlots(botCount, playerColor) {
    const botCustomizationContainer =
      document.getElementById("bot-custom-slots");
    botCustomizationContainer.innerHTML = "";

    const availableColors = playerColors.filter(
      (color) => color !== playerColor
    );
    const defaultBotNames = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"];

    for (let i = 0; i < botCount; i++) {
      const botColorDefault = availableColors[i % availableColors.length];
      const colorName =
        botColorDefault.charAt(0).toUpperCase() + botColorDefault.slice(1);
      const botNameDefault = `${colorName} ${
        defaultBotNames[i % defaultBotNames.length]
      }`;

      const botSlot = document.createElement("div");
      botSlot.className = "bot-custom-slot";
      botSlot.dataset.botIndex = i;

      const nameContainer = document.createElement("div");
      nameContainer.className = "bot-custom-field";

      const nameLabel = document.createElement("label");
      nameLabel.textContent = "Bot Name:";
      nameContainer.appendChild(nameLabel);

      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.className = "bot-name-input";
      nameInput.value = botNameDefault;
      nameInput.maxLength = 20;
      nameContainer.appendChild(nameInput);

      botSlot.appendChild(nameContainer);

      const colorContainer = document.createElement("div");
      colorContainer.className = "bot-custom-field";

      const colorLabel = document.createElement("label");
      colorLabel.textContent = "Choose Color:";
      colorContainer.appendChild(colorLabel);

      const colorOptions = document.createElement("div");
      colorOptions.className = "bot-color-options";

      availableColors.forEach((color) => {
        const colorOption = document.createElement("div");
        colorOption.className = "color-option";
        colorOption.style.backgroundColor = color;
        colorOption.dataset.color = color;

        if (color === botColorDefault) {
          colorOption.classList.add("selected");
        }

        colorOption.addEventListener("click", () => {
          colorOptions.querySelectorAll(".color-option").forEach((opt) => {
            opt.classList.remove("selected");
          });

          colorOption.classList.add("selected");

          const currentName = nameInput.value;
          if (currentName.includes(colorName)) {
            const selectedColorName =
              color.charAt(0).toUpperCase() + color.slice(1);
            nameInput.value = currentName.replace(colorName, selectedColorName);
          }
        });

        colorOptions.appendChild(colorOption);
      });

      colorContainer.appendChild(colorOptions);
      botSlot.appendChild(colorContainer);

      const coinsContainer = document.createElement("div");
      coinsContainer.className = "bot-custom-field";

      const coinsLabel = document.createElement("label");
      coinsLabel.textContent = "Starting Coins:";
      coinsContainer.appendChild(coinsLabel);

      const coinsInput = document.createElement("input");
      coinsInput.type = "number";
      coinsInput.className = "bot-coins-input";
      coinsInput.min = "0";
      coinsInput.max = "99";
      coinsInput.value = "0";

      coinsInput.addEventListener("input", () => {
        coinsInput.value = coinsInput.value.replace(/[^0-9]/g, "");

        if (coinsInput.value.length > 2) {
          coinsInput.value = coinsInput.value.slice(0, 2);
        }

        const numValue = parseInt(coinsInput.value) || 0;
        if (numValue > 99) {
          coinsInput.value = "99";
        }
      });

      coinsInput.addEventListener("blur", () => {
        if (coinsInput.value === "") {
          coinsInput.value = "0";
        }
      });

      coinsContainer.appendChild(coinsInput);
      botSlot.appendChild(coinsContainer);

      botCustomizationContainer.appendChild(botSlot);
    }
  }

  document
    .getElementById("continue-bot-custom")
    .addEventListener("click", () => {
      const botSlots = document.querySelectorAll(".bot-custom-slot");
      const customizedBots = [];

      botSlots.forEach((slot) => {
        const nameInput = slot.querySelector(".bot-name-input");
        const botName =
          nameInput.value.trim() || `Bot ${slot.dataset.botIndex + 1}`;
        const colorOption = slot.querySelector(".color-option.selected");
        const coinsInput = slot.querySelector(".bot-coins-input");
        const startingCoins = parseInt(coinsInput.value) || 0;

        if (!colorOption) return;

        customizedBots.push({
          name: botName,
          color: colorOption.dataset.color,
          coins: startingCoins,
          kills: 0,
          isBot: true,
        });
      });

      StateLocal.storeBots(customizedBots);

      document.getElementById("bot-customization").classList.add("hidden");

      document
        .getElementById("difficulty-selection")
        .classList.remove("hidden");

      document.getElementById("lobby-title").textContent = "Select Difficulty";
    });

  document.querySelector(".back-button").addEventListener("click", () => {
    document.getElementById("lobby-title").classList.remove("hidden");

    if (
      document.getElementById("sp-game-lobby") &&
      !document.getElementById("sp-game-lobby").classList.contains("hidden")
    ) {
      document.getElementById("sp-game-lobby").classList.add("hidden");
      document.getElementById("time-selection").classList.remove("hidden");
      document.getElementById("lobby-title").textContent = "Select Round Time";
    } else if (
      !document.getElementById("time-selection").classList.contains("hidden")
    ) {
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
      document.getElementById("difficulty-selection").classList.add("hidden");
      document.getElementById("bot-customization").classList.remove("hidden");
      document.getElementById("lobby-title").textContent = "Customize Bots";
    } else if (
      !document.getElementById("bot-customization").classList.contains("hidden")
    ) {
      document.getElementById("bot-customization").classList.add("hidden");
      document.getElementById("bot-selection").classList.remove("hidden");
      document.getElementById("lobby-title").textContent = "Select Bots";
    } else if (
      !document.getElementById("bot-selection").classList.contains("hidden")
    ) {
      document.getElementById("bot-selection").classList.add("hidden");
      document.getElementById("initial-setup").classList.remove("hidden");
      document.getElementById("lobby-title").textContent = "Character name";
    } else {
      document.getElementById("initial-setup").classList.add("hidden");
      document.getElementById("bot-selection").classList.add("hidden");
      document.getElementById("bot-customization").classList.add("hidden");
      document.getElementById("difficulty-selection").classList.add("hidden");
      document.getElementById("time-selection").classList.add("hidden");
      document.querySelector(".lobby-buttons").classList.remove("hidden");
      document.getElementById("toggle-joke").classList.remove("hidden");
      document.querySelector(".back-button").classList.add("hidden");
      document.getElementById("lobby-title").textContent =
        "Welcome to Treasure Hunters Arena";
    }
  });

  document
    .getElementById("start-difficulty-game")
    .addEventListener("click", () => {
      const selectedDifficulty = document.querySelector(
        "#difficulty-selection .player-select button.selected"
      );

      if (!selectedDifficulty) {
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

      const difficulty = selectedDifficulty.dataset.modeBots;
      StateLocal.setBotDifficulty(difficulty);

      const bots = StateLocal.getBots();
      if (bots && bots.length > 0) {
        bots.forEach((bot) => {
          bot.difficulty = difficulty;
        });
        StateLocal.storeBots(bots);
      }

      document.getElementById("difficulty-selection").classList.add("hidden");

      document.getElementById("time-selection").classList.remove("hidden");

      document.getElementById("lobby-title").textContent = "Select Round Time";
    });

  function showSinglePlayerLobby(player, bots, gameSettings) {
    document.getElementById("lobby-title").textContent = "Game Lobby";
    document.getElementById("lobby-title").classList.add("hidden");

    let singleLobbyContainer = document.getElementById("sp-game-lobby");
    if (!singleLobbyContainer) {
      singleLobbyContainer = document.createElement("div");
      singleLobbyContainer.id = "sp-game-lobby";
      singleLobbyContainer.className = "game-lobby";
      document
        .getElementById("regular-content")
        .appendChild(singleLobbyContainer);
    }

    singleLobbyContainer.innerHTML = "";

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

    const playersContainer = document.createElement("div");
    playersContainer.className = "lobby-players";

    const playersListHeader = document.createElement("h3");
    playersListHeader.textContent = "Players";
    playersContainer.appendChild(playersListHeader);

    const playersList = document.createElement("div");
    playersList.id = "sp-lobby-players-list";
    playersContainer.appendChild(playersList);

    const playerElement = createPlayerElement(player, true, true);
    playersList.appendChild(playerElement);

    bots.forEach((bot, index) => {
      const isReady = Math.random() > 0.5;
      const botElement = createPlayerElement(bot, false, isReady);

      bot.isReady = isReady;

      setTimeout(() => {
        playersList.appendChild(botElement);

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

            checkAllReady();
          }, 1000 + Math.random() * 5000);
        }
      }, 500 * index);
    });

    singleLobbyContainer.appendChild(playersContainer);

    const startButton = document.createElement("button");
    startButton.id = "sp-start-game-btn";
    startButton.className = "lobby-button";
    startButton.textContent = "Start Game";
    startButton.disabled = true;

    startButton.addEventListener("click", () => {
      startSinglePlayerGame(player, bots, gameSettings);
    });

    singleLobbyContainer.appendChild(startButton);

    singleLobbyContainer.classList.remove("hidden");

    function checkAllReady() {
      const allReady = bots.every((bot) => bot.isReady);

      if (allReady) {
        startButton.disabled = false;
        startButton.textContent = "Start Game";
        startButton.classList.add("all-ready");
      }
    }

    checkAllReady();
  }

  function createPlayerElement(player, isHuman, isReady) {
    const playerElement = document.createElement("div");
    playerElement.className = "lobby-player";
    playerElement.style.borderLeft = `4px solid ${player.color}`;

    const playerName = document.createElement("div");
    playerName.className = "player-name";

    let displayName;
    if (isHuman) {
      displayName = `👑 ${player.name}`;
    } else {
      const colorName =
        player.color.charAt(0).toUpperCase() + player.color.slice(1);
      if (!player.name.includes(colorName)) {
        displayName = `${colorName} ${player.name}`;
      } else {
        displayName = player.name;
      }
      displayName += " (Bot)";

      if (player.coins > 0) {
        displayName += ` <span class="bot-starting-coins">💰 ${player.coins}</span>`;
      }
    }

    playerName.innerHTML = displayName;

    playerElement.appendChild(playerName);

    const playerStatus = document.createElement("div");
    playerStatus.className = `player-status-display ${
      isReady ? "status-ready" : "status-not-ready"
    }`;
    playerStatus.textContent = isReady ? "Ready" : "Not Ready";

    playerElement.appendChild(playerStatus);

    playerElement.classList.add("player-joined");
    setTimeout(() => {
      playerElement.classList.remove("player-joined");
    }, 500);

    return playerElement;
  }

  function startSinglePlayerGame(player, bots, gameSettings) {
    console.log("Starting game with:", { player, bots, gameSettings });

    const lobby = document.getElementById("sp-game-lobby");
    lobby.style.animation = "fadeOut 0.5s forwards";

    const countdownOverlay = document.createElement("div");
    countdownOverlay.className = "countdown-overlay";
    document.body.appendChild(countdownOverlay);

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

        audio.play();

        setTimeout(() => {
          document.querySelector("#lobby").classList.add("hidden");
          document.querySelector("#game-content").classList.remove("hidden");
          countdownOverlay.remove();

          import("./src/core/game/singlePlayer/initSinglePlayerGame.js")
            .then((module) => {
              const cleanupGame = module.initSinglePlayerGame(
                player,
                bots,
                gameSettings
              );

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

  document.querySelector(".back-button").addEventListener("click", () => {
    document.getElementById("lobby-title").classList.remove("hidden");

    if (
      document.getElementById("sp-game-lobby") &&
      !document.getElementById("sp-game-lobby").classList.contains("hidden")
    ) {
      document.getElementById("sp-game-lobby").classList.add("hidden");
      document.getElementById("time-selection").classList.remove("hidden");
      document.getElementById("lobby-title").textContent = "Select Round Time";
    } else if (
      !document.getElementById("time-selection").classList.contains("hidden")
    ) {
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
      document.getElementById("difficulty-selection").classList.add("hidden");
      document.getElementById("bot-selection").classList.remove("hidden");
      document.getElementById("lobby-title").textContent = "Select Bots";
    } else if (
      !document.getElementById("bot-selection").classList.contains("hidden")
    ) {
      document.getElementById("bot-selection").classList.add("hidden");
      document.getElementById("initial-setup").classList.remove("hidden");
      document.getElementById("lobby-title").textContent = "Character name";
    } else {
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

  document.getElementById("start-game-final").addEventListener("click", () => {
    const selectedTime = document.querySelector(
      "#time-selection .time-select button.selected"
    );

    if (!selectedTime) {
      const timeSelectElement = document.querySelector(
        "#time-selection .time-select"
      );
      showTooltip("Please select a round time", 3000, timeSelectElement);
      return;
    }

    const gameSettings = StateLocal.getGameSettings();
    const playerInfo = StateLocal.getPlayerInfo();

    const bots = StateLocal.getBots();

    const roundTime = parseInt(selectedTime.dataset.time);
    gameSettings.roundTime = roundTime;
    StateLocal.setGameSettings(
      bots.length,
      gameSettings.gameMode,
      roundTime,
      gameSettings.botDifficulty
    );

    document.getElementById("time-selection").classList.add("hidden");

    showSinglePlayerLobby(playerInfo, bots, gameSettings);
  });
})();
