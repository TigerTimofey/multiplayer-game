import { showTooltip } from "../../components/tooltip/tooltip.js";
import { showGameLobby } from "./showGameLobby.js";
import { generateRoomCode } from "./generateRoomCode.js";
import { playerColors } from "../../constants/palyerColors.js";

import state from "../../state.js";

export function initializeLobby() {
  const initialSetup = document.querySelector("#initial-setup");
  const colorOptions = document.querySelector(".color-options");
  const continueSetup = document.querySelector("#continue-setup");
  const createRoomBtn = document.querySelector("#create-room");
  const joinRoomBtn = document.querySelector("#join-room");
  const lobbyButtons = document.querySelector(".lobby-buttons");

  let selectedColor = null;
  let playerName = "";
  let setupAction = null;

  playerColors.forEach((color) => {
    const option = document.createElement("div");
    option.className = "color-option";
    option.style.backgroundColor = color;
    option.dataset.color = color;
    colorOptions.appendChild(option);
  });

  const nameInput = document.querySelector("#lobby-name");
  nameInput.addEventListener("input", (e) => {
    playerName = e.target.value.trim();
  });

  colorOptions.addEventListener("click", (e) => {
    if (e.target.classList.contains("color-option")) {
      document
        .querySelectorAll(".color-option")
        .forEach((opt) => opt.classList.remove("selected"));
      e.target.classList.add("selected");
      selectedColor = e.target.dataset.color;

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

    state.setSavedPlayerName(nameInput.value.trim());
    state.setSavedPlayerColor(selectedColor);

    initialSetup.classList.add("hidden");
    if (setupAction === "create") {
      document.querySelector("#room-creation").classList.remove("hidden");
    } else {
      document.querySelector("#room-join").classList.remove("hidden");
      document.querySelector("#lobby-title").textContent = "Joining Room";
    }
  });

  document.querySelectorAll(".player-select button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".player-select button")
        .forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");

      document
        .querySelector(".time-select-container")
        .classList.remove("hidden");
    });
  });

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

      const capacityDiv = document.createElement("div");
      capacityDiv.className = "room-capacity";
      capacityDiv.textContent = `Players: ${roomData.currentPlayers}/${roomData.maxPlayers}`;
      playersList.appendChild(capacityDiv);

      if (roomData.players) {
        Object.entries(roomData.players).forEach(([id, player]) => {
          const playerEl = document.createElement("div");
          playerEl.className = "lobby-player";
          playerEl.style.color = player.color;

          const readyStatus = player.isReady ? "Ready" : "Not Ready";
          const statusClass = player.isReady
            ? "status-ready"
            : "status-not-ready";

          if (id === state.getPlayerId()) {
            playerEl.innerHTML = `
              <div class="player-name">${player.name} ${
              player.isHost ? "(Host)" : ""
            }</div>
              <button class="player-status ${statusClass}">${readyStatus}</button>
            `;

            const statusBtn = playerEl.querySelector(".player-status");
            statusBtn.addEventListener("click", () => {
              const playerRef = roomRef.child(`players/${state.getPlayerId()}`);
              playerRef.update({
                isReady: !player.isReady,
              });
            });
          } else {
            playerEl.innerHTML = `
              <div class="player-name">${player.name} ${
              player.isHost ? "(Host)" : ""
            }</div>
              <div class="player-status-display ${statusClass}">${readyStatus}</div>
            `;
          }

          playersList.appendChild(playerEl);
        });

        const startButton = document.querySelector("#start-game-btn");
        const allPlayersReady = Object.values(roomData.players).every(
          (p) => p.isReady
        );
        startButton.disabled = !allPlayersReady;
      }
    });
  }

  document.querySelector("#join-game").addEventListener("click", () => {
    const codeInput = document.querySelector("#room-code");
    const code = codeInput.value.trim().toUpperCase();
    const roomRef = firebase.database().ref(`rooms/${code}`);

    roomRef
      .once("value")
      .then((snapshot) => {
        const room = snapshot.val();
        if (!room) throw new Error("Room not found!");

        const playerCount = room.players ? Object.keys(room.players).length : 0;
        if (playerCount >= room.maxPlayers) {
          throw new Error(
            `Room is full (${playerCount}/${room.maxPlayers} players)`
          );
        }

        return roomRef.transaction((currentRoom) => {
          if (!currentRoom) return null;
          return {
            ...currentRoom,
            currentPlayers: playerCount + 1,
            isOpen: playerCount + 1 < room.maxPlayers,
            lastJoined: state.getPlayerId(),
            players: {
              ...currentRoom.players,
              [state.getPlayerId()]: {
                joined: Date.now(),
                name: state.getSavedPlayerName(),
                color: state.getSavedPlayerColor(),
                isReady: false,
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

  document.querySelector("#start-game-btn").addEventListener("click", () => {
    const roomCode = document.querySelector("#room-code-display").textContent;
    const roomRef = firebase.database().ref(`rooms/${roomCode}`);

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
        elements.lobbyTitle.textContent = "Welcome to Multiplayer Game";
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
