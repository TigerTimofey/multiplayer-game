import { mapData } from "./src/core/constants/mapData.js";
import { playerColors } from "./src/core/constants/palyerColors.js";
import { getRandomSafeSpot } from "./src/core/constants/mapData.js";
import { POWERS } from "./src/core/constants/powers.js";
import { randomFromArray, getKeyString } from "./src/utils/helpers.js";
import { placeCoin } from "./src/core/game/player/player-coin-logic/coinManager.js";
import { showTooltip } from "./src/core/components/tooltip/tooltip.js";
import { handleArrowPress } from "./src/core/game/player/player-interact/movement.js";
import { handleRestart } from "./src/core/game/game-process/handleRestart.js";
import { domElements } from "./src/utils/domElements.js";
import { updateScoreboard } from "./src/core/components/scoreboard/updateScoreboard.js";
import { startCountdown } from "./src/core/components/counter/startCountdown.js";
import state from "./src/core/state.js";
import { resetToMainMenu } from "./src/core/game/lobby/resetToMainMenu.js";
import { updatePlayerPosition } from "./src/core/game/player/player-interact/updatePlayerPosition.js";
import { activatePowerByKey } from "./src/core/game/player/player-interact/activatePowerByKey.js";

(function () {
  domElements.restartButton.addEventListener("click", () => {
    handleRestart(
      state.getPlayerRef(),
      state.getPlayerId(),
      state.getSavedPlayerName(),
      playerColors
    );
  });

  let activePowers = {};

  function handlePlayerLeave(roomCode) {
    if (!roomCode) return;

    // Remove player from room's players list
    firebase
      .database()
      .ref(`rooms/${roomCode}/players/${state.getPlayerId()}`)
      .remove();

    // Update current player count and room status
    firebase
      .database()
      .ref(`rooms/${roomCode}`)
      .transaction((room) => {
        if (!room) return null;
        const newPlayerCount = Math.max(0, (room.currentPlayers || 1) - 1);
        return {
          ...room,
          currentPlayers: newPlayerCount,
          isOpen: newPlayerCount < room.maxPlayers, // Set isOpen true if there's still space
        };
      });
  }

  function generateRoomCode() {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 5; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }

  function showGameLobby(roomCode) {
    state.setCurrentRoomCode(roomCode);
    document.querySelector("#room-creation").classList.add("hidden");
    document.querySelector("#room-join").classList.add("hidden");
    document.querySelector("#game-lobby").classList.remove("hidden");
    document.querySelector("#room-code-display").textContent = roomCode;
    document.querySelector("#toggle-joke").classList.add("hidden");
    document.querySelector("#lobby-title").classList.add("hidden");

    // Add click-to-copy functionality
    const roomCodeDisplay = document.querySelector("#room-code-display");
    roomCodeDisplay.style.cursor = "pointer";
    roomCodeDisplay.title = "Click to copy";
    roomCodeDisplay.addEventListener("click", () => {
      navigator.clipboard.writeText(roomCode).then(() => {
        showTooltip(roomCodeDisplay, "Code copied!");
      });
    });

    // Replace back button with styled leave room button
    const backButton = document.querySelector(".back-button");
    backButton.className = "leave-room-btn";
    backButton.textContent = "Leave Room";
    backButton.onclick = () => {
      handlePlayerLeave(roomCode);
      resetToMainMenu();
    };

    setupPlayerCleanup(roomCode);
    const roomRef = firebase.database().ref(`rooms/${roomCode}`);
    setupRoomListeners(roomRef);
  }

  // function resetToMainMenu() {
  //   // Reset UI elements
  //   const leaveButton = document.querySelector(".leave-room-btn");
  //   leaveButton.className = "back-button hidden";
  //   leaveButton.textContent = "←";

  //   // Reset title
  //   document.querySelector("#lobby-title").textContent =
  //     "Welcome to Multiplayer Game";

  //   // Reset room code
  //   state.setCurrentRoomCode(null);

  //   // Show main menu elements
  //   document.querySelector("#lobby-title").classList.remove("hidden");
  //   document.querySelector(".lobby-buttons").classList.remove("hidden");
  //   document.querySelector("#game-lobby").classList.add("hidden");
  //   document.querySelector("#toggle-joke").classList.remove("hidden");

  //   // Clear any existing game state
  //   document.querySelector("#lobby-players-list").innerHTML = "";
  // }

  function setupRoomListeners(roomRef) {
    roomRef.on("value", (snapshot) => {
      const roomData = snapshot.val();
      if (!roomData) return;

      const playersList = document.querySelector("#lobby-players-list");
      playersList.innerHTML = "";

      const capacityDiv = document.createElement("div");
      capacityDiv.className = "room-capacity";
      capacityDiv.textContent = `Players: ${roomData.currentPlayers}/${roomData.maxPlayers}`;
      playersList.appendChild(capacityDiv);

      if (roomData.players) {
        Object.entries(roomData.players).forEach(([id, player]) => {
          const playerEl = document.createElement("div");
          playerEl.className = "lobby-player";
          playerEl.style.color = player.color;

          // Render status differently for current user vs others
          const readyStatus = player.isReady ? "Is Ready" : "Not Ready";
          const statusClass = player.isReady
            ? "status-ready"
            : "status-not-ready";

          // For current user: clickable button
          // For others: just text display
          const statusHtml =
            id === state.getPlayerId()
              ? `<button class="player-status ${statusClass}">${readyStatus}</button>`
              : `<div class="player-status-display ${statusClass}">${readyStatus}</div>`;

          playerEl.innerHTML = `
            <div class="player-name">${player.name} ${
            player.isHost ? "(Host)" : ""
          }</div>
            ${statusHtml}
          `;

          // Add click handler only for current user
          if (id === state.getPlayerId()) {
            const statusBtn = playerEl.querySelector(".player-status");
            statusBtn.title = "Click to toggle ready status";
            statusBtn.addEventListener("click", () => {
              const playerRef = roomRef.child(`players/${state.getPlayerId()}`);
              playerRef.update({
                isReady: !player.isReady,
              });
            });
          }

          playersList.appendChild(playerEl);
        });

        // Enable start button for everyone when all players are ready
        const startButton = document.querySelector("#start-game-btn");
        const allPlayersReady = Object.values(roomData.players).every(
          (p) => p.isReady
        );

        startButton.disabled = !allPlayersReady;
        if (allPlayersReady) {
          startButton.title = "All players ready - Click to start!";
        } else {
          startButton.title = "Waiting for all players to be ready";
        }

        // Remove opacity changes that were tied to host status
        startButton.style.opacity = "1";
      }

      // Show start button only for host
      const startButton = document.querySelector("#start-game-btn");
      if (state.getPlayerId() === roomData.hostId) {
        startButton.classList.add("host");
      } else {
        startButton.classList.remove("host");
      }

      // Only start countdown if game hasn't started yet
      if (
        roomData.countdownStarted &&
        !roomData.gameStarted &&
        !window.countdownTriggered
      ) {
        window.countdownTriggered = true;
        startCountdown(roomRef);
      }
    });
  }

  document.querySelector("#start-game-btn").addEventListener("click", () => {
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

  function initializeLobby() {
    const initialSetup = document.querySelector("#initial-setup");
    const colorOptions = document.querySelector(".color-options");
    const continueSetup = document.querySelector("#continue-setup");
    const createRoomBtn = document.querySelector("#create-room");
    const joinRoomBtn = document.querySelector("#join-room");
    const lobbyButtons = document.querySelector(".lobby-buttons");

    let selectedColor = null; // Remove default color
    let playerName = "";
    let setupAction = null; // Will store 'create' or 'join'

    // Initialize color options without default selection
    playerColors.forEach((color) => {
      const option = document.createElement("div");
      option.className = "color-option";
      option.style.backgroundColor = color;
      option.dataset.color = color;
      colorOptions.appendChild(option);
    });

    // Handle name input separately
    const nameInput = document.querySelector("#lobby-name");
    nameInput.addEventListener("input", (e) => {
      playerName = e.target.value.trim();
    });

    // Color selection handler
    colorOptions.addEventListener("click", (e) => {
      if (e.target.classList.contains("color-option")) {
        document
          .querySelectorAll(".color-option")
          .forEach((opt) => opt.classList.remove("selected"));
        e.target.classList.add("selected");
        selectedColor = e.target.dataset.color;

        // Only update name if it exists
        if (playerName) {
          const nameParts = playerName.split(" ");
          const nameWithoutColor = playerColors.includes(
            nameParts[0].toLowerCase()
          )
            ? nameParts.slice(1).join(" ")
            : playerName;

          const colorName =
            selectedColor.charAt(0).toUpperCase() + selectedColor.slice(1);
          nameInput.value = `${colorName} ${nameWithoutColor}`;
        }
      }
    });

    // Show setup form when create/join is clicked
    createRoomBtn.addEventListener("click", () => {
      setupAction = "create";
      lobbyButtons.classList.add("hidden");
      initialSetup.classList.remove("hidden");
    });

    joinRoomBtn.addEventListener("click", () => {
      setupAction = "join";
      lobbyButtons.classList.add("hidden");
      initialSetup.classList.remove("hidden");
    });

    // Handle continue after name/color selection
    continueSetup.addEventListener("click", () => {
      const nameInput = document.querySelector("#lobby-name");

      if (!playerName) {
        showTooltip(nameInput, "Please enter your name");
        nameInput.focus();
        return;
      }

      const colorOptions = document.querySelector(".color-options");
      if (!selectedColor) {
        showTooltip(colorOptions, "Please select a color");
        return;
      }

      // Save player details
      state.setSavedPlayerName(nameInput.value.trim());
      state.setSavedPlayerColor(selectedColor);

      // Hide setup and show appropriate next step
      initialSetup.classList.add("hidden");
      if (setupAction === "create") {
        document.querySelector("#room-creation").classList.remove("hidden");
      } else {
        document.querySelector("#room-join").classList.remove("hidden");
        document.querySelector("#lobby-title").textContent = "Joining Room"; // Add this line
      }
    });

    // Update existing handlers to use saved name/color
    document.querySelectorAll(".player-select button").forEach((btn) => {
      btn.addEventListener("click", () => {
        // First, remove selected class from other player buttons
        document
          .querySelectorAll(".player-select button")
          .forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");

        // Show time selection after player count is selected
        document
          .querySelector(".time-select-container")
          .classList.remove("hidden");
      });
    });

    // Update time selection handler to create room only when both selections are made
    document.querySelectorAll(".time-select button").forEach((btn) => {
      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".time-select button")
          .forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");

        const selectedPlayers = document.querySelector(
          ".player-select button.selected"
        );
        if (!selectedPlayers) {
          showTooltip(btn, "Please select number of players first");
          return;
        }

        const maxPlayers = parseInt(selectedPlayers.dataset.players);
        const roundTime = parseInt(btn.dataset.time);
        const roomCode = generateRoomCode();
        const roomRef = firebase.database().ref(`rooms/${roomCode}`);

        roomRef
          .set({
            maxPlayers,
            roundTime,
            currentPlayers: 1,
            isOpen: true,
            created: Date.now(),
            hostId: state.getPlayerId(),
            players: {
              [state.getPlayerId()]: {
                isHost: true,
                joined: Date.now(),
                name: state.getSavedPlayerName(),
                color: state.getSavedPlayerColor(),
                isReady: false,
              },
            },
          })
          .then(() => {
            showGameLobby(roomCode);
          });
      });
    });

    function updateLobbyPlayers(players, roomRef) {
      const playersList = document.querySelector("#lobby-players-list");

      roomRef.on("value", (snapshot) => {
        const roomData = snapshot.val();
        if (!roomData) return;

        playersList.innerHTML = "";

        // Update room capacity display
        const capacityDiv = document.createElement("div");
        capacityDiv.className = "room-capacity";
        capacityDiv.textContent = `Players: ${roomData.currentPlayers}/${roomData.maxPlayers}`;
        playersList.appendChild(capacityDiv);

        // Update player list
        if (roomData.players) {
          Object.entries(roomData.players).forEach(([id, player]) => {
            const playerEl = document.createElement("div");
            playerEl.className = "lobby-player";
            playerEl.style.color = player.color;

            // Add ready/not ready status
            const readyStatus = player.isReady ? "Ready" : "Not Ready";
            const statusClass = player.isReady
              ? "status-ready"
              : "status-not-ready";

            // Different HTML for current player vs others
            if (id === state.getPlayerId()) {
              // For current player: show interactive button
              playerEl.innerHTML = `
                <div class="player-name">${player.name} ${
                player.isHost ? "(Host)" : ""
              }</div>
                <button class="player-status ${statusClass}">${readyStatus}</button>
              `;

              // Add click handler for status button
              const statusBtn = playerEl.querySelector(".player-status");
              statusBtn.addEventListener("click", () => {
                const playerRef = roomRef.child(
                  `players/${state.getPlayerId()}`
                );
                playerRef.update({
                  isReady: !player.isReady,
                });
              });
            } else {
              // For other players: show status as text only
              playerEl.innerHTML = `
                <div class="player-name">${player.name} ${
                player.isHost ? "(Host)" : ""
              }</div>
                <div class="player-status-display ${statusClass}">${readyStatus}</div>
              `;
            }

            playersList.appendChild(playerEl);
          });

          // Update start button visibility based on all players ready
          const startButton = document.querySelector("#start-game-btn");
          const allPlayersReady = Object.values(roomData.players).every(
            (p) => p.isReady
          );
          startButton.disabled = !allPlayersReady;
        }
      });
    }

    // Update join game handler
    document.querySelector("#join-game").addEventListener("click", () => {
      const codeInput = document.querySelector("#room-code");
      const code = codeInput.value.trim().toUpperCase();
      const roomRef = firebase.database().ref(`rooms/${code}`);

      roomRef
        .once("value")
        .then((snapshot) => {
          const room = snapshot.val();
          if (!room) throw new Error("Room not found!");

          const playerCount = room.players
            ? Object.keys(room.players).length
            : 0;
          if (playerCount >= room.maxPlayers) {
            throw new Error(
              `Room is full (${playerCount}/${room.maxPlayers} players)`
            );
          }

          // Update room data atomically
          return roomRef.transaction((currentRoom) => {
            if (!currentRoom) return null;
            return {
              ...currentRoom,
              currentPlayers: playerCount + 1,
              isOpen: playerCount + 1 < room.maxPlayers,
              lastJoined: state.getPlayerId(), // Add this to mark newest player
              players: {
                ...currentRoom.players,
                [state.getPlayerId()]: {
                  joined: Date.now(),
                  name: state.getSavedPlayerName(),
                  color: state.getSavedPlayerColor(),
                  isReady: false, // Initialize as not ready
                },
              },
            };
          });
        })
        .then(() => {
          showGameLobby(code);
          roomRef.child("players").on("value", (snapshot) => {
            const players = snapshot.val() || {};
            updateLobbyPlayers(players, roomRef);
          });
        })
        .catch((error) => {
          showTooltip(codeInput, error.message);
        });
    });

    // Add start game handler
    document.querySelector("#start-game-btn").addEventListener("click", () => {
      const roomCode = document.querySelector("#room-code-display").textContent;
      const roomRef = firebase.database().ref(`rooms/${roomCode}`);

      // Set countdown start time
      roomRef.update({
        countdownStarted: Date.now(),
      });
    });

    const backButton = document.querySelector(".back-button");
    const lobbyTitle = document.querySelector("#lobby-title");
    let currentStep = "main";
    function showStep(step) {
      currentStep = step;
      const elements = {
        backButton:
          document.querySelector(".back-button") ||
          document.querySelector(".leave-room-btn"),
        lobbyTitle: document.querySelector("#lobby-title"),
        toggleJoke: document.querySelector("#toggle-joke"),
        initialSetup: document.querySelector("#initial-setup"),
        lobbyButtons: document.querySelector(".lobby-buttons"),
        roomCreation: document.querySelector("#room-creation"),
        roomJoin: document.querySelector("#room-join"),
      };

      switch (step) {
        case "main":
          elements.backButton.classList.add("hidden");
          elements.backButton.textContent = "←";
          elements.lobbyTitle.classList.remove("hidden");
          elements.lobbyTitle.textContent = "Welcome to Multiplayer Game"; // Reset title
          elements.lobbyButtons.classList.remove("hidden");
          elements.initialSetup.classList.add("hidden");
          elements.roomCreation.classList.add("hidden");
          elements.roomJoin.classList.add("hidden");
          elements.toggleJoke.classList.remove("hidden");
          break;
        case "setup":
          elements.backButton.textContent = "←";
          elements.backButton.classList.remove("hidden");
          elements.toggleJoke.classList.add("hidden");
          elements.lobbyTitle.classList.remove("hidden");
          elements.lobbyTitle.textContent = "Create Character";
          elements.lobbyButtons.classList.add("hidden");
          elements.initialSetup.classList.remove("hidden");
          break;
        case "create":
          elements.backButton.classList.remove("hidden");
          elements.toggleJoke.classList.add("hidden");
          elements.lobbyTitle.textContent = "Create Room";
          elements.roomCreation.classList.remove("hidden");
          elements.initialSetup.classList.add("hidden");
          break;
      }
    }

    backButton.addEventListener("click", () => {
      switch (currentStep) {
        case "setup":
          showStep("main");
          break;
        case "create":
        case "join":
          showStep("setup");
          break;
      }
    });

    createRoomBtn.addEventListener("click", () => {
      setupAction = "create";
      showStep("setup");
    });

    joinRoomBtn.addEventListener("click", () => {
      setupAction = "join";
      showStep("setup");
    });

    continueSetup.addEventListener("click", () => {
      if (!playerName) {
        showTooltip(nameInput, "Please enter your name");
        nameInput.focus();
        return;
      }

      if (!selectedColor) {
        showTooltip(colorOptions, "Please select a color");
        return;
      }

      state.setSavedPlayerName(nameInput.value.trim());
      state.setSavedPlayerColor(selectedColor);

      showStep(setupAction);
    });

    const toggleJoke = document.querySelector("#toggle-joke");
    const regularContent = document.querySelector("#regular-content");
    const jokeContent = document.querySelector("#joke-content");

    toggleJoke.addEventListener("click", () => {
      regularContent.classList.toggle("hidden");
      jokeContent.classList.toggle("hidden");

      // Use the existing lobbyTitle variable
      if (jokeContent.classList.contains("hidden")) {
        lobbyTitle.textContent = "Welcome to Multiplayer Game";
        lobbyTitle.classList.remove("hidden");
        toggleJoke.textContent = "Settings";
      } else {
        lobbyTitle.classList.add("hidden");
        toggleJoke.textContent = "Lobby";
      }
    });
  }

  function setupPlayerCleanup(roomCode) {
    if (!roomCode) return;

    const roomRef = firebase.database().ref(`rooms/${roomCode}`);
    const playerInRoomRef = roomRef.child("players").child(state.getPlayerId());

    // Remove player from room on disconnect
    playerInRoomRef.onDisconnect().remove();

    // Setup room cleanup
    roomRef.child("players").on("value", (snapshot) => {
      const players = snapshot.val() || {};
      const playerCount = Object.keys(players).length;

      roomRef.once("value").then((roomSnapshot) => {
        const roomData = roomSnapshot.val();
        if (!roomData) return;

        if (playerCount === 0) {
          roomRef.remove();
        } else {
          roomRef.update({
            currentPlayers: playerCount,
            isOpen: playerCount < roomData.maxPlayers,
          });
        }
      });
    });

    // Cancel cleanup listeners when disconnecting
    playerInRoomRef
      .onDisconnect()
      .setWithPriority({}, null)
      .then(() => {
        roomRef.child("players").off();
      });
  }

  function cleanupPlayer() {
    if (state.getCurrentRoomCode()) {
      const roomRef = firebase
        .database()
        .ref(
          `rooms/${state.getCurrentRoomCode()}/players/${state.getPlayerId()}`
        );
      roomRef.remove();
    }
    if (state.getPlayerRef()) {
      state.getPlayerRef().remove();
    }
  }

  // Add window unload handler
  window.addEventListener("beforeunload", () => {
    cleanupPlayer();
  });

  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      //You're logged in!
      state.setPlayerId(user.uid);
      state.setPlayerRef(
        firebase.database().ref(`players/${state.getPlayerId()}`)
      );

      // Make sure game is hidden initially
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
      // ...
      console.log(errorCode, errorMessage);
    });

  // Add time selection handler
  document.querySelectorAll(".time-select button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".time-select button")
        .forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
    });
  });
})();
