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
      name: playerNameInput.value,
      direction: "right",
      color: randomFromArray(playerColors),
      x,
      y,
      coins: 0,
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
    // Add frozen check
    if (players[playerId].frozen) return;

    const speed = players[playerId].speed || 1;
    const newX = players[playerId].x + xChange * speed;
    const newY = players[playerId].y + yChange * speed;
    if (!isSolid(newX, newY)) {
      //move to the next space
      players[playerId].x = newX;
      players[playerId].y = newY;
      if (xChange === 1) {
        players[playerId].direction = "right";
      }
      if (xChange === -1) {
        players[playerId].direction = "left";
      }
      playerRef.set(players[playerId]);
      attemptGrabCoin(newX, newY);
      checkPlayerCollisions(newX, newY); // Add this line
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
          gameOverModal.classList.remove("hidden");
          document.querySelector(
            "#eliminated-by"
          ).textContent = `Eliminated by ${otherPlayer.name} who had ${otherPlayer.coins} coins!`;

          const myElement = playerElements[playerId];
          myElement.classList.add("eliminated");

          setTimeout(() => {
            playerRef.remove();
          }, 1000);
        }
      }
    });
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

    allPlayersRef.on("value", (snapshot) => {
      //Fires whenever a change occurs
      players = snapshot.val() || {};
      updateScoreboard(); // Add this line
      Object.keys(players).forEach((key) => {
        const characterState = players[key];
        let el = playerElements[key];

        // Проверяем, был ли игрок побежден
        if (key === playerId && characterState.isDefeated) {
          gameOverModal.classList.remove("hidden");
          document.querySelector(
            "#eliminated-by"
          ).textContent = `Eliminated by ${characterState.defeatedBy.name} who had ${characterState.defeatedBy.coins} coins!`;
          el.classList.add("eliminated");
        }

        // Обновляем DOM
        el.querySelector(".Character_name").innerText = characterState.name;
        el.querySelector(".Character_coins").innerText = characterState.coins;
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
      });
    });
    allPlayersRef.on("child_added", (snapshot) => {
      //Fires whenever a new nod e is added the tree
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
      playerElements[addedPlayer.id] = characterElement;

      //Fill in some initial state
      characterElement.querySelector(".Character_name").innerText =
        addedPlayer.name;
      characterElement.querySelector(".Character_coins").innerText =
        addedPlayer.coins;
      characterElement.setAttribute("data-color", addedPlayer.color);
      characterElement.setAttribute("data-direction", addedPlayer.direction);
      const left = 16 * addedPlayer.x + "px";
      const top = 16 * addedPlayer.y - 4 + "px";
      characterElement.style.transform = `translate3d(${left}, ${top}, 0)`;
      gameContainer.appendChild(characterElement);
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

    //Updates player name with text input
    playerNameInput.addEventListener("change", (e) => {
      const newName = e.target.value || createName();
      playerNameInput.value = newName;
      playerRef.update({
        name: newName,
      });
    });

    //Update player color on button click
    playerColorButton.addEventListener("click", () => {
      const mySkinIndex = playerColors.indexOf(players[playerId].color);
      const nextColor = playerColors[mySkinIndex + 1] || playerColors[0];
      playerRef.update({
        color: nextColor,
      });
    });

    //Place my first coin
    placeCoin();
    initPowers();
  }

  // Add new variables
  const POWERS = {
    speed: {
      cost: 3,
      duration: 5000,
      cooldown: 8000,
    },
    shield: {
      cost: 5,
      duration: 7000,
      cooldown: 15000,
    },
    teleport: {
      cost: 4,
      duration: 0, // Instant effect
      cooldown: 10000,
    },
    grow: {
      cost: 6,
      duration: 6000,
      cooldown: 15000,
    },
  };

  let activePowers = {};

  firebase.auth().onAuthStateChanged((user) => {
    console.log(user);
    console.log(user);
    if (user) {
      //You're logged in!
      playerId = user.uid;
      playerRef = firebase.database().ref(`players/${playerId}`);

      const name = createName();
      playerNameInput.value = name;

      const { x, y } = getRandomSafeSpot();

      playerRef.set({
        id: playerId,
        name,
        direction: "right",
        color: randomFromArray(playerColors),
        x,
        y,
        coins: 0,
        eliminated: false,
        isDefeated: false,
      });

      //Remove me from Firebase when I diconnect
      playerRef.onDisconnect().remove();

      //Begin the game now that we are signed in
      initGame();
    } else {
      //You're logged out.
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
