const mapData = {
  minX: 1,
  maxX: 14,
  minY: 4,
  maxY: 12,
  blockedSpaces: {
    "7x4": true,
    "1x11": true,
    "12x10": true,
    "4x7": true,
    "5x7": true,
    "6x7": true,
    "8x6": true,
    "9x6": true,
    "10x6": true,
    "7x9": true,
    "8x9": true,
    "9x9": true,
  },
};

// Options for Player Colors... these are in the same order as our sprite sheet
const playerColors = ["blue", "red", "orange", "yellow", "green", "purple"];

//Misc Helpers
function randomFromArray(array) {
  return array[Math.floor(Math.random() * array.length)];
}
function getKeyString(x, y) {
  return `${x}x${y}`;
}

function createName() {
  const prefix = randomFromArray([
    "COOL",
    "SUPER",
    "HIP",
    "SMUG",
    "COOL",
    "SILKY",
    "GOOD",
    "SAFE",
    "DEAR",
    "DAMP",
    "WARM",
    "RICH",
    "LONG",
    "DARK",
    "SOFT",
    "BUFF",
    "DOPE",
  ]);
  const animal = randomFromArray([
    "BEAR",
    "DOG",
    "CAT",
    "FOX",
    "LAMB",
    "LION",
    "BOAR",
    "GOAT",
    "VOLE",
    "SEAL",
    "PUMA",
    "MULE",
    "BULL",
    "BIRD",
    "BUG",
  ]);
  return `${prefix} ${animal}`;
}

function isSolid(x, y) {
  const blockedNextSpace = mapData.blockedSpaces[getKeyString(x, y)];
  return (
    blockedNextSpace ||
    x >= mapData.maxX ||
    x < mapData.minX ||
    y >= mapData.maxY ||
    y < mapData.minY
  );
}

function getRandomSafeSpot() {
  //We don't look things up by key here, so just return an x/y
  return randomFromArray([
    { x: 1, y: 4 },
    { x: 2, y: 4 },
    { x: 1, y: 5 },
    { x: 2, y: 6 },
    { x: 2, y: 8 },
    { x: 2, y: 9 },
    { x: 4, y: 8 },
    { x: 5, y: 5 },
    { x: 5, y: 8 },
    { x: 5, y: 10 },
    { x: 5, y: 11 },
    { x: 11, y: 7 },
    { x: 12, y: 7 },
    { x: 13, y: 7 },
    { x: 13, y: 6 },
    { x: 13, y: 8 },
    { x: 7, y: 6 },
    { x: 7, y: 7 },
    { x: 7, y: 8 },
    { x: 8, y: 8 },
    { x: 10, y: 8 },
    { x: 8, y: 8 },
    { x: 11, y: 4 },
  ]);
}

(function () {
  // Add modal elements to the existing variables
  let playerId;
  let playerRef;
  let players = {};
  let playerElements = {};
  let coins = {};
  let coinElements = {};
  let savedPlayerName = ""; // Add this at the top with other variables

  const gameContainer = document.querySelector(".game-container");
  const playerNameInput = document.querySelector("#player-name");
  const playerColorButton = document.querySelector("#player-color");
  const gameOverModal = document.querySelector("#game-over-modal");
  const restartButton = document.querySelector("#restart-button");

  // Add restart game handler
  function handleRestart() {
    gameOverModal.classList.add("hidden");
    const { x, y } = getRandomSafeSpot();

    playerRef.set({
      id: playerId,
      name: savedPlayerName, // Use saved name instead of input value
      direction: "right",
      color: randomFromArray(playerColors),
      x,
      y,
      coins: 0,
      joinTime: Date.now(), // Add join time on restart
    });
  }

  restartButton.addEventListener("click", handleRestart);

  function placeCoin() {
    const { x, y } = getRandomSafeSpot();
    const coinRef = firebase.database().ref(`coins/${getKeyString(x, y)}`);
    coinRef.set({
      x,
      y,
    });

    const coinTimeouts = [2000, 3000, 4000, 5000];
    setTimeout(() => {
      placeCoin();
    }, randomFromArray(coinTimeouts));
  }

  function attemptGrabCoin(x, y) {
    const key = getKeyString(x, y);
    if (coins[key]) {
      // Remove this key from data, then uptick Player's coin count
      firebase.database().ref(`coins/${key}`).remove();
      playerRef.update({
        coins: players[playerId].coins + 1,
      });
    }
  }

  function handleArrowPress(xChange = 0, yChange = 0) {
    const player = players[playerId];
    if (!player || player.frozen) return;

    const speed = player.speed || 1;
    const newX = player.x + xChange * speed;
    const newY = player.y + yChange * speed;

    if (!isSolid(newX, newY)) {
      const newDirection =
        xChange === 1
          ? "right"
          : xChange === -1
          ? "left"
          : players[playerId].direction;

      // Update main player
      playerRef.update({
        x: newX,
        y: newY,
        direction: newDirection,
      });

      // Update clones if they exist
      if (players[playerId].clones) {
        const updatedClones = players[playerId].clones.map((clone, index) => {
          // Calculate offset based on clone index to maintain formation
          const angleOffset =
            (index / players[playerId].clones.length) * Math.PI * 2;
          const radius = 2; // Distance from player

          return {
            ...clone,
            x: newX + Math.round(Math.cos(angleOffset) * radius),
            y: newY + Math.round(Math.sin(angleOffset) * radius),
            direction: newDirection,
          };
        });

        playerRef.update({ clones: updatedClones });
      }

      attemptGrabCoin(newX, newY);
      checkPlayerCollisions(newX, newY);
    }
  }

  function checkPlayerCollisions(x, y) {
    if (players[playerId].shield) return;

    const myCoins = players[playerId].isGiant
      ? players[playerId].coins * 2 // Double power when giant
      : players[playerId].coins;

    Object.keys(players).forEach((key) => {
      if (key === playerId) return;

      const otherPlayer = players[key];
      if (otherPlayer.x === x && otherPlayer.y === y) {
        // Check if shield is active
        if (players[playerId].powers?.shield) {
          return; // Shield blocks all collisions
        }
        if (myCoins > otherPlayer.coins) {
          // Я атакую игрока с меньшим количеством монет
          // Отправляем сообщение о поражении атакованному игроку
          firebase
            .database()
            .ref(`players/${key}`)
            .update({
              isDefeated: true,
              defeatedBy: {
                name: players[playerId].name,
                coins: myCoins,
              },
            });

          // Даем время на отображение модального окна
          setTimeout(() => {
            firebase.database().ref(`players/${key}`).remove();
          }, 1000);
        } else if (myCoins < otherPlayer.coins) {
          // Меня атаковал игрок с большим количеством монет
          const playerStats = {
            coins: players[playerId].coins,
            joinTime: players[playerId].joinTime,
          };
          showGameOver(
            { name: otherPlayer.name, coins: otherPlayer.coins },
            playerStats
          );

          const myElement = playerElements[playerId];
          myElement.classList.add("eliminated");

          setTimeout(() => {
            playerRef.remove();
          }, 1000);
        }
      }
    });
  }

  function showGameOver(eliminatedBy, playerStats) {
    gameOverModal.classList.remove("hidden");

    const eliminatedByEl = document.querySelector("#eliminated-by");
    eliminatedByEl.textContent = `Eliminated by ${eliminatedBy.name} who had ${eliminatedBy.coins} coins!`;

    document.querySelector("#final-coins").textContent = playerStats.coins;

    // Check if joinTime exists before calculating
    if (playerStats.joinTime) {
      const timeAlive = Math.floor((Date.now() - playerStats.joinTime) / 1000);
      const minutes = Math.floor(timeAlive / 60);
      const seconds = timeAlive % 60;
      document.querySelector(
        "#time-survived"
      ).textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;
    } else {
      document.querySelector("#time-survived").textContent = "0:00";
    }

    const allPlayers = Object.values(players);
    const rank =
      allPlayers
        .sort((a, b) => b.coins - a.coins)
        .findIndex((p) => p.id === playerId) + 1;
    document.querySelector("#final-rank").textContent = `#${rank}`;
  }

  function updateScoreboard() {
    const playersList = document.querySelector("#players-list");
    playersList.innerHTML = "";

    // Sort players by coins
    const sortedPlayers = Object.values(players).sort(
      (a, b) => b.coins - a.coins
    );

    sortedPlayers.forEach((player) => {
      const div = document.createElement("div");
      div.classList.add("player-score");
      if (player.id === playerId) {
        div.classList.add("you");
      }
      div.innerHTML = `
        <span>${player.name}</span>
        <span>${player.coins}</span>
      `;
      playersList.appendChild(div);
    });
  }

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

    if (players[playerId].coins >= cost && !activePowers[power]) {
      const newCoinAmount = players[playerId].coins - cost;

      switch (power) {
        case "speed":
          playerRef.update({
            coins: newCoinAmount,
            speed: 2,
          });
          break;
        case "shield":
          playerRef.update({
            coins: newCoinAmount,
            shield: true,
          });
          break;
        case "teleport":
          const randomSpot = getRandomSafeSpot();
          playerRef.update({
            coins: newCoinAmount,
            x: randomSpot.x,
            y: randomSpot.y,
          });
          break;
        case "grow":
          playerRef.update({
            coins: newCoinAmount,
            isGiant: true,
            scale: 2, // Add scale property
          });
          const characterElement = playerElements[playerId];
          characterElement.classList.add("giant");
          characterElement.style.transform = `translate3d(${
            16 * players[playerId].x
          }px, ${16 * players[playerId].y - 4}px, 0) scale(2)`;
          break;
        case "ultimate":
          // Dragon form transformation with coin magnet effect
          playerRef.update({
            coins: newCoinAmount,
            isUltimate: true,
            isDragon: true,
            speed: 2,
            shield: true,
            scale: 2,
            damage: players[playerId].coins * 3,
            isMagnet: true, // Add magnet state
          });

          // Get all coins and animate them towards the player
          Object.keys(coins).forEach((key) => {
            const [coinX, coinY] = key.split("x").map(Number);
            const coinElement = coinElements[key];

            if (coinElement) {
              coinElement.classList.add("magnetized");
              const targetX = 16 * players[playerId].x;
              const targetY = 16 * players[playerId].y - 4;

              setTimeout(() => {
                coinElement.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
                // Collect coin after animation
                setTimeout(() => {
                  firebase.database().ref(`coins/${key}`).remove();
                  playerRef.update({
                    coins: players[playerId].coins + 1,
                  });
                }, 500);
              }, 100);
            }
          });

          const element = playerElements[playerId];
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
            playerRef.update({
              isGiant: false,
              scale: 1,
            });
            const characterElement = playerElements[playerId];
            characterElement.classList.remove("giant");
            characterElement.style.transform = `translate3d(${
              16 * players[playerId].x
            }px, ${16 * players[playerId].y - 4}px, 0) scale(1)`;
          }
          if (power === "ultimate") {
            playerRef.update({
              isUltimate: false,
              isDragon: false,
              speed: 1,
              shield: false,
              scale: 1,
              damage: null,
            });
            const element = playerElements[playerId];
            element.classList.remove("dragon");
          }
          button.classList.remove("active");
          cooldown.style.width = "0%";
          activePowers[power] = false;
        }, POWERS[power].duration);
      }
    }
  }

  function activatePower(power, button) {
    const powerConfig = POWERS[power];
    activePowers[power] = true;
    button.classList.add("active");

    // Add power effect
    playerElements[playerId].classList.add(power);

    // Handle power specific effects
    if (power === "speed") {
      // Double movement speed
      players[playerId].speed = 2;
    }

    // Start cooldown animation
    const cooldown = button.querySelector(".cooldown");
    cooldown.style.width = "100%";

    // Remove power after duration
    setTimeout(() => {
      playerRef.update({
        [`powers.${power}`]: null,
        speed: power === "speed" ? 1 : players[playerId].speed,
      });
      playerElements[playerId].classList.remove(power);
      button.classList.remove("active");

      // Start cooldown
      button.classList.add("disabled");
      setTimeout(() => {
        button.classList.remove("disabled");
        activePowers[power] = false;
        cooldown.style.width = "0%";
      }, powerConfig.cooldown);
    }, powerConfig.duration);
  }

  function updatePlayerPosition(characterElement, x, y, scale = 1) {
    const left = 16 * x + "px";
    const top = 16 * y - 4 + "px";
    characterElement.style.transform = `translate3d(${left}, ${top}, 0) scale(${scale})`;
  }

  function initGame() {
    // Change back to arrow keys for movement
    new KeyPressListener("ArrowUp", () => handleArrowPress(0, -1));
    new KeyPressListener("ArrowDown", () => handleArrowPress(0, 1));
    new KeyPressListener("ArrowLeft", () => handleArrowPress(-1, 0));
    new KeyPressListener("ArrowRight", () => handleArrowPress(1, 0));

    // Powers with W and E keys
    new KeyPressListener("KeyW", () => activatePowerByKey("speed"));
    new KeyPressListener("KeyE", () => activatePowerByKey("shield"));

    const allPlayersRef = firebase.database().ref(`players`);
    const allCoinsRef = firebase.database().ref(`coins`);

    allPlayersRef.on("child_added", (snapshot) => {
      const addedPlayer = snapshot.val();
      const characterElement = document.createElement("div");
      characterElement.classList.add("Character", "grid-cell");
      if (addedPlayer.id === playerId) {
        characterElement.classList.add("you");
      }
      characterElement.innerHTML = `
        <div class="Character_shadow grid-cell"></div>
        <div class="Character_sprite grid-cell"></div>
        <div class="Character_name-container">
          <span class="Character_name"></span>
          <span class="Character_coins">0</span>
        </div>
        <div class="Character_you-arrow"></div>
      `;

      // Store element reference first
      playerElements[addedPlayer.id] = characterElement;
      gameContainer.appendChild(characterElement);

      // Then set initial state
      characterElement.querySelector(".Character_name").innerText =
        addedPlayer.name;
      characterElement.querySelector(".Character_coins").innerText =
        addedPlayer.coins;
      characterElement.setAttribute("data-color", addedPlayer.color);
      characterElement.setAttribute("data-direction", addedPlayer.direction);

      const left = 16 * addedPlayer.x + "px";
      const top = 16 * addedPlayer.y - 4 + "px";
      characterElement.style.transform = `translate3d(${left}, ${top}, 0)`;
    });

    allPlayersRef.on("value", (snapshot) => {
      players = snapshot.val() || {};
      updateScoreboard();

      Object.keys(players).forEach((key) => {
        const characterState = players[key];
        let el = playerElements[key];

        // Skip if element doesn't exist yet
        if (!el) return;

        // Check if player was defeated
        if (key === playerId && characterState.isDefeated) {
          gameOverModal.classList.remove("hidden");
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

        el.setAttribute("data-color", characterState.color);
        el.setAttribute("data-direction", characterState.direction);

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
            let cloneElement = playerElements[cloneId];

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
              playerElements[cloneId] = cloneElement;
              gameContainer.appendChild(cloneElement);
            }

            cloneElement.setAttribute("data-color", clone.color);
            updatePlayerPosition(cloneElement, clone.x, clone.y);
          });
        }

        // Clean up removed clones
        Object.keys(playerElements).forEach((elementId) => {
          if (elementId.startsWith("clone-") && elementId.includes(key)) {
            const [, playerId] = elementId.split("-");
            if (!characterState.clones) {
              gameContainer.removeChild(playerElements[elementId]);
              delete playerElements[elementId];
            }
          }
        });
      });
    });

    //Remove character DOM element after they leave
    allPlayersRef.on("child_removed", (snapshot) => {
      const removedKey = snapshot.val().id;
      gameContainer.removeChild(playerElements[removedKey]);
      delete playerElements[removedKey];
    });

    //New - not in the video!
    //This block will remove coins from local state when Firebase `coins` value updates
    allCoinsRef.on("value", (snapshot) => {
      coins = snapshot.val() || {};
    });
    //

    allCoinsRef.on("child_added", (snapshot) => {
      const coin = snapshot.val();
      const key = getKeyString(coin.x, coin.y);
      coins[key] = true;

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
      coinElements[key] = coinElement;
      gameContainer.appendChild(coinElement);
    });
    allCoinsRef.on("child_removed", (snapshot) => {
      const { x, y } = snapshot.val();
      const keyToRemove = getKeyString(x, y);
      gameContainer.removeChild(coinElements[keyToRemove]);
      delete coinElements[keyToRemove];
    });

    //Update player color on button click
    playerColorButton.addEventListener("click", () => {
      const mySkinIndex = playerColors.indexOf(players[playerId].color);
      const nextColor = playerColors[mySkinIndex + 1] || playerColors[0];
      const currentName = players[playerId].name.split(" ").slice(1).join(" "); // Remove old color prefix
      const displayName = `${
        nextColor.charAt(0).toUpperCase() + nextColor.slice(1)
      } ${currentName}`;

      playerRef.update({
        color: nextColor,
        name: displayName,
      });
    });

    //Place my first coin
    placeCoin();
    initPowers();
  }

  // Add new variables
  const POWERS = {
    speed: {
      cost: 4,
      duration: 5000,
      cooldown: 8000,
    },
    shield: {
      cost: 5,
      duration: 7000,
      cooldown: 15000,
    },
    teleport: {
      cost: 6,
      duration: 0, // Instant effect
      cooldown: 10000,
    },
    grow: {
      cost: 7,
      duration: 6000,
      cooldown: 15000,
    },
    ultimate: {
      cost: 12,
      duration: 8000,
      cooldown: 20000,
    },
  };

  let activePowers = {};

  function updateRoomPlayerCount(roomCode) {
    if (!roomCode) return;

    const roomRef = firebase.database().ref(`rooms/${roomCode}`);
    return roomRef.transaction((room) => {
      if (!room) return null;

      const playerCount = room.players ? Object.keys(room.players).length : 0;
      room.currentPlayers = playerCount;
      room.isOpen = playerCount < room.maxPlayers;
      return room;
    });
  }

  function handlePlayerLeave(roomCode) {
    if (!roomCode) return;

    // Remove player from room's players list
    firebase.database().ref(`rooms/${roomCode}/players/${playerId}`).remove();

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

  // Add before initializeLobby
  function generateRoomCode() {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 5; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }

  function showGameLobby(roomCode) {
    document.querySelector("#room-creation").classList.add("hidden");
    document.querySelector("#room-join").classList.add("hidden");
    document.querySelector("#game-lobby").classList.remove("hidden");
    document.querySelector("#room-code-display").textContent = roomCode;
  }

  function initializeLobby() {
    const lobby = document.querySelector("#lobby");
    const initialSetup = document.querySelector("#initial-setup");
    const lobbyName = document.querySelector("#lobby-name");
    const colorOptions = document.querySelector(".color-options");
    const continueSetup = document.querySelector("#continue-setup");
    const createRoomBtn = document.querySelector("#create-room");
    const joinRoomBtn = document.querySelector("#join-room");
    const lobbyButtons = document.querySelector(".lobby-buttons");

    let selectedColor = playerColors[0];
    let playerName = "";
    let setupAction = null; // Will store 'create' or 'join'

    // Initialize color options
    playerColors.forEach((color, index) => {
      const option = document.createElement("div");
      option.className = "color-option" + (index === 0 ? " selected" : "");
      option.style.backgroundColor = color;
      option.dataset.color = color;
      colorOptions.appendChild(option);
    });

    // Color selection handler
    colorOptions.addEventListener("click", (e) => {
      if (e.target.classList.contains("color-option")) {
        document
          .querySelectorAll(".color-option")
          .forEach((opt) => opt.classList.remove("selected"));
        e.target.classList.add("selected");
        selectedColor = e.target.dataset.color;
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
      playerName = lobbyName.value.trim();
      if (!playerName) {
        alert("Please enter your name!");
        return;
      }

      // Save player details
      savedPlayerName = playerName;
      savedPlayerColor = selectedColor;

      // Hide setup and show appropriate next step
      initialSetup.classList.add("hidden");
      if (setupAction === "create") {
        document.querySelector("#room-creation").classList.remove("hidden");
      } else {
        document.querySelector("#room-join").classList.remove("hidden");
      }
    });

    // Update existing handlers to use saved name/color
    document.querySelectorAll(".player-select button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const maxPlayers = parseInt(btn.dataset.players);
        const roomCode = generateRoomCode();
        const roomRef = firebase.database().ref(`rooms/${roomCode}`);

        roomRef
          .set({
            maxPlayers,
            currentPlayers: 1,
            isOpen: true,
            created: Date.now(),
            hostId: playerId,
            players: {
              [playerId]: {
                isHost: true,
                joined: Date.now(),
                name: savedPlayerName,
                color: savedPlayerColor,
              },
            },
          })
          .then(() => {
            showGameLobby(roomCode);
            roomRef.child("players").on("value", (snapshot) => {
              const players = snapshot.val() || {};
              updateLobbyPlayers(players, roomRef); // Pass roomRef here
            });
          });
      });
    });

    function updateLobbyPlayers(players, roomRef) {
      const playersList = document.querySelector("#lobby-players-list");
      playersList.innerHTML = "";

      // Show player list first while room data is loading
      const currentPlayers = Object.keys(players).length;

      Object.entries(players).forEach(([id, player]) => {
        const playerEl = document.createElement("div");
        playerEl.className = "lobby-player";
        playerEl.style.color = player.color;
        playerEl.innerHTML = `
          ${player.name} ${player.isHost ? "(Host)" : ""}
          <div class="player-status">Ready</div>
        `;
        playersList.appendChild(playerEl);
      });

      // If roomRef is provided, get max players
      if (roomRef) {
        roomRef.once("value").then((snapshot) => {
          const room = snapshot.val();
          if (room) {
            // Add room capacity display at the top
            const capacityDiv = document.createElement("div");
            capacityDiv.className = "room-capacity";
            capacityDiv.textContent = `Players: ${currentPlayers}/${room.maxPlayers}`;
            playersList.insertBefore(capacityDiv, playersList.firstChild);
          }
        });
      }
    }

    // Update join game handler
    document.querySelector("#join-game").addEventListener("click", () => {
      const code = document
        .querySelector("#room-code")
        .value.trim()
        .toUpperCase();
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

          // Add player to room
          return roomRef
            .child("players")
            .child(playerId)
            .set({
              joined: Date.now(),
              name: savedPlayerName,
              color: savedPlayerColor,
            })
            .then(() => {
              return updateRoomPlayerCount(code);
            });
        })
        .then(() => {
          showGameLobby(code);
          roomRef.child("players").on("value", (snapshot) => {
            const players = snapshot.val() || {};
            updateLobbyPlayers(players, roomRef);
          });
        })
        .catch((error) => alert(error.message));
    });

    function updateLobbyPlayers(players, roomRef) {
      const playersList = document.querySelector("#lobby-players-list");
      playersList.innerHTML = "";

      roomRef.once("value").then((snapshot) => {
        const room = snapshot.val();
        const maxPlayers = room.maxPlayers;
        const currentPlayers = Object.keys(players).length;

        // Add room capacity display
        const capacityDiv = document.createElement("div");
        capacityDiv.className = "room-capacity";
        capacityDiv.textContent = `Players: ${currentPlayers}/${maxPlayers}`;
        playersList.appendChild(capacityDiv);

        // Add player list
        Object.entries(players).forEach(([id, player]) => {
          const playerEl = document.createElement("div");
          playerEl.className = "lobby-player";
          playerEl.style.color = player.color;
          playerEl.innerHTML = `
            ${player.name} ${player.isHost ? "(Host)" : ""}
            <div class="player-status">Ready</div>
          `;
          playersList.appendChild(playerEl);
        });
      });
    }

    // Add start game handler
    document.querySelector("#start-game-btn").addEventListener("click", () => {
      const roomCode = document.querySelector("#room-code-display").textContent;
      const roomRef = firebase.database().ref(`rooms/${roomCode}`);

      // Initialize the player's starting position
      const { x, y } = getRandomSafeSpot();
      playerRef
        .set({
          id: playerId,
          name: savedPlayerName,
          direction: "right",
          color: savedPlayerColor,
          x,
          y,
          coins: 0,
          frozen: false,
          joinTime: Date.now(),
        })
        .then(() => {
          roomRef
            .update({
              gameStarted: true,
            })
            .then(() => {
              document.querySelector("#lobby").classList.add("hidden");
              document
                .querySelector("#game-content")
                .classList.remove("hidden");
              initGame();
            });
        });
    });

    // ...rest of existing initializeLobby code...
  }

  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      //You're logged in!
      playerId = user.uid;
      playerRef = firebase.database().ref(`players/${playerId}`);

      // Make sure game is hidden initially
      document.querySelector("#game-content").classList.add("hidden");

      playerRef.onDisconnect().remove();
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
})();
