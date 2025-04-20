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
import state from "./src/core/state.js";

(function () {
  domElements.restartButton.addEventListener("click", () => {
    handleRestart(
      state.getPlayerRef(),
      state.getPlayerId(),
      state.getSavedPlayerName(),
      playerColors
    );
  });

  function initPowers() {
    // Update keyboard listeners
    new KeyPressListener("KeyW", () => activatePowerByKey("speed"));
    new KeyPressListener("KeyE", () => activatePowerByKey("shield"));
    new KeyPressListener("KeyR", () => activatePowerByKey("teleport"));
    new KeyPressListener("KeyA", () => activatePowerByKey("grow"));
    new KeyPressListener("KeyQ", () => activatePowerByKey("ultimate"));

    document.querySelectorAll(".power-button").forEach((button) => {
      button.addEventListener("click", () => {
        const power = button.dataset.power;
        activatePowerByKey(power);
      });
    });
  }

  function activatePowerByKey(power) {
    const button = document.querySelector(`[data-power="${power}"]`);
    const cost = parseInt(button.dataset.cost);

    if (
      state.getPlayers()[state.getPlayerId()].coins >= cost &&
      !activePowers[power]
    ) {
      const newCoinAmount =
        state.getPlayers()[state.getPlayerId()].coins - cost;

      switch (power) {
        case "speed":
          state.getPlayerRef().update({
            coins: newCoinAmount,
            speed: 2,
          });
          break;
        case "shield":
          state.getPlayerRef().update({
            coins: newCoinAmount,
            shield: true,
          });
          break;
        case "teleport":
          const randomSpot = getRandomSafeSpot();
          state.getPlayerRef().update({
            coins: newCoinAmount,
            x: randomSpot.x,
            y: randomSpot.y,
          });
          break;
        case "grow":
          state.getPlayerRef().update({
            coins: newCoinAmount,
            isGiant: true,
            scale: 2, // Add scale property
          });
          const characterElement =
            state.getPlayerElements()[state.getPlayerId()];
          characterElement.classList.add("giant");
          characterElement.style.transform = `translate3d(${
            16 * state.getPlayers()[state.getPlayerId()].x
          }px, ${
            16 * state.getPlayers()[state.getPlayerId()].y - 4
          }px, 0) scale(2)`;
          break;
        case "ultimate":
          // Dragon form transformation with coin magnet effect
          state.getPlayerRef().update({
            coins: newCoinAmount,
            isUltimate: true,
            isDragon: true,
            speed: 2,
            shield: true,
            scale: 2,
            damage: state.getPlayers()[state.getPlayerId()].coins * 3,
            isMagnet: true, // Add magnet state
          });

          // Get all coins and animate them towards the player
          Object.keys(state.getCoins()).forEach((key) => {
            const [coinX, coinY] = key.split("x").map(Number);
            const coinElement = state.getCoinElements()[key];

            if (coinElement) {
              coinElement.classList.add("magnetized");
              const targetX = 16 * state.getPlayers()[state.getPlayerId()].x;
              const targetY =
                16 * state.getPlayers()[state.getPlayerId()].y - 4;

              setTimeout(() => {
                coinElement.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
                // Collect coin after animation
                setTimeout(() => {
                  firebase.database().ref(`coins/${key}`).remove();
                  state.getPlayerRef().update({
                    coins: state.getPlayers()[state.getPlayerId()].coins + 1,
                  });
                }, 500);
              }, 100);
            }
          });

          const element = state.getPlayerElements()[state.getPlayerId()];
          element.classList.add("dragon");
          break;
      }

      // Visual feedback and cooldown
      button.classList.add("active");
      const cooldown = button.querySelector(".cooldown");
      cooldown.style.width = "100%";

      if (POWERS[power].duration > 0) {
        setTimeout(() => {
          if (power === "grow") {
            state.getPlayerRef().update({
              isGiant: false,
              scale: 1,
            });
            const characterElement =
              state.getPlayerElements()[state.getPlayerId()];
            characterElement.classList.remove("giant");
            characterElement.style.transform = `translate3d(${
              16 * state.getPlayers()[state.getPlayerId()].x
            }px, ${
              16 * state.getPlayers()[state.getPlayerId()].y - 4
            }px, 0) scale(1)`;
          }
          if (power === "ultimate") {
            state.getPlayerRef().update({
              isUltimate: false,
              isDragon: false,
              speed: 1,
              shield: false,
              scale: 1,
              damage: null,
            });
            const element = state.getPlayerElements()[state.getPlayerId()];
            element.classList.remove("dragon");
          }
          button.classList.remove("active");
          cooldown.style.width = "0%";
          activePowers[power] = false;
        }, POWERS[power].duration);
      }
    }
  }

  function updatePlayerPosition(characterElement, x, y, scale = 1) {
    const left = 16 * x + "px";
    const top = 16 * y - 4 + "px";
    characterElement.style.transform = `translate3d(${left}, ${top}, 0) scale(${scale})`;
  }

  function initGame() {
    // Ensure gameOverModal: domElements.gameOverModal is passed to handleArrowPress
    new KeyPressListener("ArrowUp", () =>
      handleArrowPress(0, -1, {
        players: state.getPlayers(),
        playerId: state.getPlayerId(),
        playerRef: state.getPlayerRef(),
        coins: state.getCoins(),
        currentRoomCode: state.getCurrentRoomCode(),
        gameOverModal: domElements.gameOverModal, // Pass gameOverModal: domElements.gameOverModal
        playerElements: state.getPlayerElements(),
      })
    );
    new KeyPressListener("ArrowDown", () =>
      handleArrowPress(0, 1, {
        players: state.getPlayers(),
        playerId: state.getPlayerId(),
        playerRef: state.getPlayerRef(),
        coins: state.getCoins(),
        currentRoomCode: state.getCurrentRoomCode(),
        gameOverModal: domElements.gameOverModal, // Pass gameOverModal: domElements.gameOverModal
        playerElements: state.getPlayerElements(),
      })
    );
    new KeyPressListener("ArrowLeft", () =>
      handleArrowPress(-1, 0, {
        players: state.getPlayers(),
        playerId: state.getPlayerId(),
        playerRef: state.getPlayerRef(),
        coins: state.getCoins(),
        currentRoomCode: state.getCurrentRoomCode(),
        gameOverModal: domElements.gameOverModal, // Pass gameOverModal: domElements.gameOverModal
        playerElements: state.getPlayerElements(),
      })
    );
    new KeyPressListener("ArrowRight", () =>
      handleArrowPress(1, 0, {
        players: state.getPlayers(),
        playerId: state.getPlayerId(),
        playerRef: state.getPlayerRef(),
        coins: state.getCoins(),
        currentRoomCode: state.getCurrentRoomCode(),
        gameOverModal: domElements.gameOverModal, // Pass gameOverModal: domElements.gameOverModal
        playerElements: state.getPlayerElements(),
      })
    );

    // Powers with W and E keys
    new KeyPressListener("KeyW", () => activatePowerByKey("speed"));
    new KeyPressListener("KeyE", () => activatePowerByKey("shield"));

    const allPlayersRef = firebase.database().ref(`players`);
    const allCoinsRef = firebase.database().ref(`coins`);

    allPlayersRef.on("child_added", (snapshot) => {
      const addedPlayer = snapshot.val();
      const characterElement = document.createElement("div");
      characterElement.classList.add("Character", "grid-cell");
      if (addedPlayer.id === state.getPlayerId()) {
        characterElement.classList.add("you");
      }
      characterElement.innerHTML = `
        <div class="Character_shadow grid-cell"></div>
        <div class="Character_sprite grid-cell"></div>
        <div class="Character_swords">
          <div class="Character_sword"></div>
          <div class="Character_sword"></div>
          <div class="Character_sword"></div>
        </div>
        <div class="Character_name-container">
          <span class="Character_name"></span>
          <span class="Character_coins">0</span>
        </div>
        <div class="Character_you-arrow"></div>
      `;

      // Store element reference first
      state.getPlayerElements()[addedPlayer.id] = characterElement;
      domElements.gameContainer.appendChild(characterElement);

      // Then set initial state
      characterElement.querySelector(".Character_name").innerText =
        addedPlayer.name;
      characterElement.querySelector(".Character_coins").innerText =
        addedPlayer.coins;
      characterElement.setAttribute("data-color", addedPlayer.color);
      characterElement.setAttribute("data-direction", addedPlayer.direction);

      // Update player position with their color for swords
      const left = 16 * addedPlayer.x + "px";
      const top = 16 * addedPlayer.y - 4 + "px";
      characterElement.style.transform = `translate3d(${left}, ${top}, 0)`;
    });

    allPlayersRef.on("value", (snapshot) => {
      state.setPlayers(snapshot.val() || {});
      updateScoreboard(state.getPlayers(), state.getPlayerId());

      Object.keys(state.getPlayers()).forEach((key) => {
        const characterState = state.getPlayers()[key];
        let el = state.getPlayerElements()[key];

        // Skip if element doesn't exist yet
        if (!el) return;

        // Check if player was defeated
        if (key === state.getPlayerId() && characterState.isDefeated) {
          gameOverModal: domElements.gameOverModal.classList.remove("hidden");
          document.querySelector(
            "#eliminated-by"
          ).textContent = `Eliminated by ${characterState.defeatedBy.name} who had ${characterState.defeatedBy.coins} coins!`;
          el.classList.add("eliminated");
        }

        // Update DOM elements safely
        const nameEl = el.querySelector(".Character_name");
        const coinsEl = el.querySelector(".Character_coins");

        if (nameEl) nameEl.innerText = characterState.name;
        if (coinsEl) coinsEl.innerText = characterState.coins;

        // Update color for both character and swords
        el.setAttribute("data-color", characterState.color);
        el.setAttribute("data-direction", characterState.direction);

        // Ensure swords container exists and has the right color
        const swordsContainer = el.querySelector(".Character_swords");
        if (swordsContainer) {
          // The CSS will handle the color based on the data-color attribute
          swordsContainer.setAttribute("data-color", characterState.color);
        }

        // Update position with scale
        updatePlayerPosition(
          el,
          characterState.x,
          characterState.y,
          characterState.scale || 1
        );

        if (characterState.isGiant) {
          el.classList.add("giant");
        } else {
          el.classList.remove("giant");
        }

        // Handle clones
        if (characterState.clones) {
          characterState.clones.forEach((clone, index) => {
            const cloneId = `clone-${key}-${index}`;
            let cloneElement = state.getPlayerElements()[cloneId];

            if (!cloneElement) {
              cloneElement = document.createElement("div");
              cloneElement.classList.add("Character", "clone");
              cloneElement.innerHTML = `
                <div class="Character_shadow grid-cell"></div>
                <div class="Character_sprite grid-cell"></div>
                <div class="Character_name-container">
                  <span class="Character_name">${clone.ownerName}'s clone</span>
                </div>
              `;
              state.getPlayerElements()[cloneId] = cloneElement;
              domElements.gameContainer.appendChild(cloneElement);
            }

            cloneElement.setAttribute("data-color", clone.color);
            updatePlayerPosition(cloneElement, clone.x, clone.y);
          });
        }

        // Clean up removed clones
        Object.keys(state.getPlayerElements()).forEach((elementId) => {
          if (elementId.startsWith("clone-") && elementId.includes(key)) {
            const [, playerId] = elementId.split("-");
            if (!characterState.clones) {
              domElements.gameContainer.removeChild(
                state.getPlayerElements()[elementId]
              );
              delete state.getPlayerElements()[elementId];
            }
          }
        });
      });
    });

    //Remove character DOM element after they leave
    allPlayersRef.on("child_removed", (snapshot) => {
      const removedKey = snapshot.val().id;
      domElements.gameContainer.removeChild(
        state.getPlayerElements()[removedKey]
      );
      delete state.getPlayerElements()[removedKey];
    });

    //New - not in the video!
    //This block will remove coins from local state when Firebase `coins` value updates
    allCoinsRef.on("value", (snapshot) => {
      state.setCoins(snapshot.val() || {});
    });
    //

    allCoinsRef.on("child_added", (snapshot) => {
      const coin = snapshot.val();
      const key = getKeyString(coin.x, coin.y);
      state.getCoins()[key] = true;

      // Create the DOM Element
      const coinElement = document.createElement("div");
      coinElement.classList.add("Coin", "grid-cell");
      coinElement.innerHTML = `
        <div class="Coin_shadow grid-cell"></div>
        <div class="Coin_sprite grid-cell"></div>
      `;

      // Position the Element
      const left = 16 * coin.x + "px";
      const top = 16 * coin.y - 4 + "px";
      coinElement.style.transform = `translate3d(${left}, ${top}, 0)`;

      // Keep a reference for removal later and add to DOM
      state.getCoinElements()[key] = coinElement;
      domElements.gameContainer.appendChild(coinElement);
    });
    allCoinsRef.on("child_removed", (snapshot) => {
      const { x, y } = snapshot.val();
      const keyToRemove = getKeyString(x, y);
      domElements.gameContainer.removeChild(
        state.getCoinElements()[keyToRemove]
      );
      delete state.getCoinElements()[keyToRemove];
    });

    placeCoin();
    initPowers();
  }

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

  function resetToMainMenu() {
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
          const readyStatus = player.isReady ? "Ready" : "Not Ready";
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
        window.countdownTriggered = true; // Set flag to prevent multiple countdowns
        startCountdown(roomRef);
      }
    });
  }

  function startCountdown(roomRef) {
    const countdownOverlay = document.createElement("div");
    countdownOverlay.className = "countdown-overlay";
    document.body.appendChild(countdownOverlay);

    let count = 3;

    function updateCount() {
      countdownOverlay.innerHTML = `<div class="countdown-number">${count}</div>`;
    }

    updateCount();

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        updateCount();
      } else if (count === 0) {
        countdownOverlay.innerHTML = `<div class="countdown-number">GO!</div>`;
      } else {
        clearInterval(interval);
        countdownOverlay.remove();
        // Set gameStarted flag in database when countdown finishes
        roomRef.update({ gameStarted: true }).then(() => startGame());
      }
    }, 1000);
  }

  function startGame() {
    const roomRef = firebase
      .database()
      .ref(`rooms/${state.getCurrentRoomCode()}`);

    roomRef.once("value").then((snapshot) => {
      const roomData = snapshot.val();
      const { x, y } = getRandomSafeSpot();

      state
        .getPlayerRef()
        .set({
          id: state.getPlayerId(),
          name: state.getSavedPlayerName(),
          direction: "right",
          color: state.getSavedPlayerColor(),
          x,
          y,
          coins: 0,
          kills: 0,
          joinTime: Date.now(),
          startTime: Date.now(),
        })
        .then(() => {
          document.querySelector("#lobby").classList.add("hidden");
          document.querySelector("#game-content").classList.remove("hidden");
          startGameTimer(roomData.roundTime);
          initGame();
        });
    });
  }

  function startGameTimer(duration) {
    const timerDisplay = document.querySelector("#timer-display");
    let timeLeft = duration;

    const timer = setInterval(() => {
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      timerDisplay.textContent = `${minutes}:${seconds
        .toString()
        .padStart(2, "0")}`;

      if (timeLeft === 0) {
        clearInterval(timer);
        endGame();
      }
      timeLeft--;
    }, 1000);

    // Store timer reference in Firebase to keep all clients synchronized
    firebase
      .database()
      .ref(`rooms/${state.getCurrentRoomCode()}`)
      .update({
        gameTimer: {
          startTime: Date.now(),
          duration: duration,
        },
      });
  }

  function endGame() {
    const playerStatsRef = firebase
      .database()
      .ref(`rooms/${state.getCurrentRoomCode()}/playerStats`);
    const playersRef = firebase
      .database()
      .ref(`rooms/${state.getCurrentRoomCode()}/players`);

    Promise.all([playerStatsRef.once("value"), playersRef.once("value")]).then(
      ([statsSnapshot, playersSnapshot]) => {
        const stats = statsSnapshot.val();
        const players = playersSnapshot.val();

        console.log("Game Over! Player Stats:");
        if (stats) {
          Object.entries(stats).forEach(([playerId, playerStats]) => {
            const playerName = players[playerId]?.name || "Unknown";
            console.log(
              `Player: ${playerName} (ID: ${playerId}) - Total Coins: ${playerStats.totalCoins}, Total Kills: ${playerStats.totalKills}`
            );
          });
        }

        // Determine top players
        let topKillsPlayer = { name: "None", kills: 0 };
        let topCoinsPlayer = { name: "None", coins: 0 };

        if (stats) {
          Object.entries(stats).forEach(([playerId, playerStats]) => {
            const playerName = players[playerId]?.name || "Unknown";
            if (playerStats.totalKills > topKillsPlayer.kills) {
              topKillsPlayer = {
                name: playerName,
                kills: playerStats.totalKills,
              };
            }
            if (playerStats.totalCoins > topCoinsPlayer.coins) {
              topCoinsPlayer = {
                name: playerName,
                coins: playerStats.totalCoins,
              };
            }
          });
        }

        // Show match ended modal
        showMatchEndedModal(topKillsPlayer, topCoinsPlayer);
      }
    );

    // Additional logic to handle game end (e.g., show game over modal)
    // ...existing code...
  }

  function showMatchEndedModal(topKillsPlayer, topCoinsPlayer) {
    const isKillsDraw =
      Object.values(state.getPlayers()).filter(
        (p) => p.kills === topKillsPlayer.kills
      ).length > 1;

    const isCoinsDraw =
      Object.values(state.getPlayers()).filter(
        (p) => p.coins === topCoinsPlayer.coins
      ).length > 1;

    const matchEndedModal = document.createElement("div");
    matchEndedModal.className = "modal";
    matchEndedModal.innerHTML = `
      <div class="modal-content">
        <h2>MATCH ENDED</h2>
        <div class="stats-container">
          <div class="stat-item">
            <div class="stat-label">Top Kills</div>
            <div class="stat-value">${
              isKillsDraw
                ? "Draw"
                : `${topKillsPlayer.name} (${topKillsPlayer.kills})`
            }</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Top Coins</div>
            <div class="stat-value">${
              isCoinsDraw
                ? "Draw"
                : `${topCoinsPlayer.name} (${topCoinsPlayer.coins})`
            }</div>
          </div>
        </div>
        <button id="close-match-ended-modal">Go to lobby</button>
      </div>
    `;

    document.body.appendChild(matchEndedModal);

    // Disable player movement
    if (state.getPlayerRef()) {
      state.getPlayerRef().update({ frozen: true });
    }

    const closeButton = matchEndedModal.querySelector(
      "#close-match-ended-modal"
    );
    closeButton.addEventListener("click", () => {
      // Remove the player from the game
      if (state.getPlayerRef()) {
        state
          .getPlayerRef()
          .remove()
          .then(() => {
            // Remove the room from Firebase
            const roomRef = firebase
              .database()
              .ref(`rooms/${state.getCurrentRoomCode()}`);
            roomRef
              .remove()
              .then(() => {
                // Show the lobby and hide the game
                document.querySelector("#game-content").classList.add("hidden");
                document.querySelector("#lobby").classList.remove("hidden");
                resetToMainMenu();
                matchEndedModal.remove();
              })
              .catch((error) => {
                console.error("Failed to remove room:", error);
              });
          });
      }
    });
  }

  // Update start game button handler
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
    let currentStep = "main"; // Track current step

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
