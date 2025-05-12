import { showTooltip } from "../../components/tooltip/tooltip.js";
import { showGameLobby } from "./showGameLobby.js";
import { generateRoomCode } from "./generateRoomCode.js";
import { playerColors } from "../../constants/palyerColors.js";
import { updateLobbyPlayers } from "./updateLobbyPlayers.js";
import { GAME_MODES } from "../../constants/gameModes.js";

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

    firebase
      .database()
      .ref("players")
      .once("value")
      .then(() => {
        state.setSavedPlayerName(nameInput.value.trim());
        state.setSavedPlayerColor(selectedColor);

        initialSetup.classList.add("hidden");
        if (setupAction === "create") {
          document.querySelector("#room-creation").classList.remove("hidden");
        } else if (setupAction === "join") {
          document.querySelector("#room-join").classList.remove("hidden");
          document.querySelector("#lobby-title").textContent = "Joining Room";
        }
      })
      .catch((error) => {
        console.error(error.message);
      });
  });

  document.querySelectorAll(".player-select button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".player-select button")
        .forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");

      document
        .querySelector(".game-mode-select-container")
        .classList.remove("hidden");
    });
  });

  document.querySelector(".game-mode-select").innerHTML = `
  <button data-mode="classic">Classic</button>
  <button data-mode="coolMode">Extra Coin</button>
  <button data-mode="survival">Hazard</button>

  `;
  // <button data-mode="treasureHunt">Treasure Hunt</button>

  document.querySelectorAll(".game-mode-select button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".game-mode-select button")
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
      const selectedMode = document.querySelector(
        ".game-mode-select button.selected"
      );
      if (!selectedPlayers || !selectedMode) {
        showTooltip(btn, "Please select players and game mode first");
        return;
      }

      const maxPlayers = parseInt(selectedPlayers.dataset.players);
      const roundTime = parseInt(btn.dataset.time);
      const gameMode = selectedMode.dataset.mode;
      const roomCode = generateRoomCode();
      const roomRef = firebase.database().ref(`rooms/${roomCode}`);

      roomRef
        .set({
          maxPlayers,
          roundTime,
          gameMode,
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

        const existingNames = Object.values(room.players || {}).map(
          (player) => player.name
        );
        if (existingNames.includes(state.getSavedPlayerName())) {
          throw new Error(
            `The name "${state.getSavedPlayerName()}" is already taken in this room.`
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
        elements.lobbyTitle.textContent = "Welcome to Treasure Hunters Arena";
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
        elements.roomJoin.classList.add("hidden");
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

    firebase
      .database()
      .ref("players")
      .once("value")
      .then(() => {
        state.setSavedPlayerName(nameInput.value.trim());
        state.setSavedPlayerColor(selectedColor);

        showStep(setupAction);
      })
      .catch((error) => {
        console.error(error.message);
      });
  });

  const toggleJoke = document.querySelector("#toggle-joke");
  const regularContent = document.querySelector("#regular-content");
  const jokeContent = document.querySelector("#joke-content");

  toggleJoke.addEventListener("click", () => {
    regularContent.classList.toggle("hidden");
    jokeContent.classList.toggle("hidden");

    if (jokeContent.classList.contains("hidden")) {
      lobbyTitle.textContent = "Welcome to Treasure Hunters Arena";
      lobbyTitle.classList.remove("hidden");
      toggleJoke.textContent = "Settings";
    } else {
      lobbyTitle.classList.add("hidden");
      toggleJoke.textContent = "Lobby";
    }
  });
}
