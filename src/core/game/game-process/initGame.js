import { handleArrowPress } from "../player/player-interact/movement.js";
import { activatePowerByKey } from "../player/player-interact/activatePowerByKey.js";
import state from "../../state.js";
import { domElements } from "../../../utils/domElements.js";
import { placeCoin } from "../player/player-coin-logic/coinManager.js";
import { getKeyString } from "../../../utils/helpers.js";
import { updateScoreboard } from "../../components/scoreboard/updateScoreboard.js";
import { updatePlayerPosition } from "../player/player-interact/updatePlayerPosition.js";
import { mapData } from "../../constants/mapData.js";

export function initGame() {
  new KeyPressListener("ArrowUp", () =>
    handleArrowPress(0, -1, {
      players: state.getPlayers(),
      playerId: state.getPlayerId(),
      playerRef: state.getPlayerRef(),
      coins: state.getCoins(),
      currentRoomCode: state.getCurrentRoomCode(),
      gameOverModal: domElements.gameOverModal,
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
      gameOverModal: domElements.gameOverModal,
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
      gameOverModal: domElements.gameOverModal,
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
      gameOverModal: domElements.gameOverModal,
      playerElements: state.getPlayerElements(),
    })
  );

  new KeyPressListener("KeyW", () => activatePowerByKey("speed"));
  new KeyPressListener("KeyE", () => activatePowerByKey("shield"));

  const allPlayersRef = firebase.database().ref(`players`);
  const allCoinsRef = firebase.database().ref(`coins`);

  const roomRef = firebase
    .database()
    .ref(`rooms/${state.getCurrentRoomCode()}`);

  roomRef.child("players").once("value", (snapshot) => {
    const players = snapshot.val();
    let playerIndex = 0;

    Object.entries(players).forEach(([playerId, player]) => {
      const boxPosition = mapData.getTreasureBoxPosition(playerIndex);
      const boxElement = document.createElement("div");
      boxElement.classList.add("TreasureBox", "grid-cell");
      boxElement.innerHTML = `
        <div class="TreasureBox_sprite grid-cell"></div>
        <div class="TreasureBox_coins" style="color: ${player.color}">
          <div>${player.name}</div>
          <span class="coin-value">0/75</span>
        </div>
      `;
      boxElement.style.transform = `translate3d(${16 * boxPosition.x}px, ${
        16 * boxPosition.y - 4
      }px, 0)`;
      boxElement.setAttribute("data-player-id", playerId);
      boxElement.style.borderColor = player.color;
      domElements.gameContainer.appendChild(boxElement);
      playerIndex++;
    });
  });

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

    state.getPlayerElements()[addedPlayer.id] = characterElement;
    domElements.gameContainer.appendChild(characterElement);

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
    state.setPlayers(snapshot.val() || {});
    updateScoreboard(state.getPlayers(), state.getPlayerId());

    Object.keys(state.getPlayers()).forEach((key) => {
      const characterState = state.getPlayers()[key];
      let el = state.getPlayerElements()[key];

      if (!el) return;

      if (key === state.getPlayerId() && characterState.isDefeated) {
        gameOverModal: domElements.gameOverModal.classList.remove("hidden");
        const defeatedByName = characterState.defeatedBy?.name || "Unknown";
        const defeatedByCoins = characterState.defeatedBy?.coins || 0;
        document.querySelector(
          "#eliminated-by"
        ).textContent = `Eliminated by ${defeatedByName} who had ${defeatedByCoins} coins!`;
        el.classList.add("eliminated");
      }

      const nameEl = el.querySelector(".Character_name");
      const coinsEl = el.querySelector(".Character_coins");

      if (nameEl) nameEl.innerText = characterState.name;
      if (coinsEl) coinsEl.innerText = characterState.coins;

      el.setAttribute("data-color", characterState.color);
      el.setAttribute("data-direction", characterState.direction);

      const swordsContainer = el.querySelector(".Character_swords");
      if (swordsContainer) {
        swordsContainer.setAttribute("data-color", characterState.color);
      }

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

      const boxPosition = mapData.getTreasureBoxPosition(
        characterState.playerIndex
      );
      if (
        characterState.x === boxPosition.x &&
        characterState.y === boxPosition.y
      ) {
        const coinsToStore = characterState.coins;
        if (coinsToStore > 0) {
          firebase
            .database()
            .ref(`players/${key}`)
            .update({
              coins: 0,
              storedCoins: (characterState.storedCoins || 0) + coinsToStore,
            });

          const boxElement = document.querySelector(
            `.TreasureBox[data-player-id="${key}"]`
          );
          if (boxElement) {
            const coinsDisplay = boxElement.querySelector(".TreasureBox_coins");
            coinsDisplay.style.color = characterState.color;
            const totalCoins = Math.min(
              (characterState.storedCoins || 0) + coinsToStore,
              75
            );
            coinsDisplay.innerHTML = `${characterState.name} <span class="coin-value">${totalCoins}/75</span>`;

            if (totalCoins >= 75) {
              console.log(`${characterState.name} wins!`);
              firebase.database().ref(`players/${key}`).update({
                coins: 0,
                storedCoins: 75,
              });

              firebase
                .database()
                .ref(`rooms/${state.getCurrentRoomCode()}`)
                .update({
                  gameEnded: true,
                  winner: {
                    name: characterState.name,
                    color: characterState.color,
                    coins: 75,
                  },
                })
                .then(() => {
                  import("../../components/modal/showMatchEndedModal.js").then(
                    (module) => {
                      const { showMatchEndedModal } = module;

                      const players = state.getPlayers();
                      const topKillsPlayer = Object.values(players).reduce(
                        (top, player) =>
                          (player.kills || 0) > (top.kills || 0) ? player : top,
                        { name: "None", kills: 0 }
                      );
                      const topCoinsPlayer = Object.values(players).reduce(
                        (top, player) =>
                          (player.coins || 0) > (top.coins || 0) ? player : top,
                        { name: "None", coins: 0 }
                      );
                      showMatchEndedModal(topKillsPlayer, topCoinsPlayer);
                    }
                  );
                });
            }
          }
        }
      }
    });
  });

  allPlayersRef.on("child_removed", (snapshot) => {
    const removedKey = snapshot.val().id;
    domElements.gameContainer.removeChild(
      state.getPlayerElements()[removedKey]
    );
    delete state.getPlayerElements()[removedKey];
  });

  allCoinsRef.on("value", (snapshot) => {
    state.setCoins(snapshot.val() || {});
  });

  allCoinsRef.on("child_added", (snapshot) => {
    const coin = snapshot.val();
    const key = getKeyString(coin.x, coin.y);
    state.getCoins()[key] = true;

    const coinElement = document.createElement("div");
    coinElement.classList.add("Coin", "grid-cell");
    coinElement.innerHTML = `
        <div class="Coin_shadow grid-cell"></div>
        <div class="Coin_sprite grid-cell"></div>
      `;

    const left = 16 * coin.x + "px";
    const top = 16 * coin.y - 4 + "px";
    coinElement.style.transform = `translate3d(${left}, ${top}, 0)`;

    state.getCoinElements()[key] = coinElement;
    domElements.gameContainer.appendChild(coinElement);
  });
  allCoinsRef.on("child_removed", (snapshot) => {
    const { x, y } = snapshot.val();
    const keyToRemove = getKeyString(x, y);
    domElements.gameContainer.removeChild(state.getCoinElements()[keyToRemove]);
    delete state.getCoinElements()[keyToRemove];
  });

  placeCoin();
  initPowers();

  const optionsButton = document.getElementById("options-button");
  const optionsModal = document.getElementById("options-modal");
  const continueButton = document.getElementById("continue-button");
  const restartButton = document.getElementById("restart-button-modal");
  const quitButton = document.getElementById("quit-button");

  optionsButton.addEventListener("click", () => {
    optionsModal.classList.remove("hidden");
  });

  continueButton.addEventListener("click", () => {
    optionsModal.classList.add("hidden");
    logActionToFirebase("Continued the game");
  });

  restartButton.addEventListener("click", () => {
    optionsModal.classList.add("hidden");

    const playerRef = state.getPlayerRef();
    const { x, y } = { x: 8, y: 8 };

    playerRef.update({
      x,
      y,
      coins: 0,
      kills: 0,
    });

    logActionToFirebase("Restarted the game");
  });

  quitButton.addEventListener("click", () => {
    const playerName = state.getSavedPlayerName();
    logActionToFirebase("Quit the game");
    firebase
      .database()
      .ref(`rooms/${state.getCurrentRoomCode()}/messages`)
      .push({
        playerId: state.getPlayerId(),
        action: `${playerName} has quit the game.`,
        timestamp: Date.now(),
      });
    optionsModal.classList.add("hidden");
    window.location.href = "/";
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      const optionsModal = document.getElementById("options-modal");
      if (optionsModal.classList.contains("hidden")) {
        optionsModal.classList.remove("hidden");
      } else {
        optionsModal.classList.add("hidden");
      }
    }
  });

  const messagesRef = firebase
    .database()
    .ref(`rooms/${state.getCurrentRoomCode()}/messages`);
  messagesRef.on("child_added", (snapshot) => {
    const { action } = snapshot.val();
    displayMessage(action);
  });

  const powersMenu = document.querySelector(".powers-menu");
  powersMenu.innerHTML += `
    <div class="power-button" data-power="invisibility" data-cost="8" data-key="KeyI">
      <div class="key-hint">I</div>
      <span>Hide</span>
      <div class="cost">8 coins</div>
      <div class="cooldown"></div>
    </div>
    <div class="power-button" data-power="doubleCoins" data-cost="10" data-key="KeyD">
      <div class="key-hint">D</div>
      <span>Double</span>
      <div class="cost">10 coins</div>
      <div class="cooldown"></div>
    </div>
  `;

  const hazardsRef = firebase
    .database()
    .ref(`rooms/${state.getCurrentRoomCode()}/hazards`);
  hazardsRef.once("value").then((snapshot) => {
    const hazards = snapshot.val() || {};
    Object.keys(hazards).forEach((key) => {
      const [x, y] = key.split("x").map(Number);
      const hazardElement = document.createElement("div");
      hazardElement.classList.add("Hazard", "grid-cell");
      hazardElement.innerHTML = `
        <div class="Hazard_shadow grid-cell"></div>
        <div class="Hazard_sprite grid-cell"></div>
      `;
      hazardElement.style.transform = `translate3d(${16 * x}px, ${
        16 * y - 4
      }px, 0)`;
      domElements.gameContainer.appendChild(hazardElement);
    });
  });

  // Periodically update hazard positions
  setInterval(() => {
    mapData.regenerateHazards();
    hazardsRef.set(mapData.hazards);

    // Update hazard elements on the map
    document.querySelectorAll(".Hazard").forEach((hazardElement) => {
      hazardElement.remove();
    });

    Object.keys(mapData.hazards).forEach((key) => {
      const [x, y] = key.split("x").map(Number);
      const hazardElement = document.createElement("div");
      hazardElement.classList.add("Hazard", "grid-cell");
      hazardElement.innerHTML = `
        <div class="Hazard_shadow grid-cell"></div>
        <div class="Hazard_sprite grid-cell"></div>
      `;
      hazardElement.style.transform = `translate3d(${16 * x}px, ${
        16 * y - 4
      }px, 0)`;
      domElements.gameContainer.appendChild(hazardElement);
    });
  }, 10000); // Update every 10 seconds
}

function logActionToFirebase(action) {
  const roomRef = firebase
    .database()
    .ref(`rooms/${state.getCurrentRoomCode()}/messages`);
  roomRef.push({
    playerId: state.getPlayerId(),
    action,
    timestamp: Date.now(),
  });
}

function displayMessage(message) {
  const messageContainer = document.createElement("div");
  messageContainer.className = "message";
  messageContainer.textContent = message;
  domElements.gameContainer.appendChild(messageContainer);

  setTimeout(() => messageContainer.remove(), 3000);
}

function initPowers() {
  new KeyPressListener("KeyW", () => activatePowerByKey("speed"));
  new KeyPressListener("KeyE", () => activatePowerByKey("shield"));
  new KeyPressListener("KeyR", () => activatePowerByKey("teleport"));
  new KeyPressListener("KeyA", () => activatePowerByKey("grow"));
  new KeyPressListener("KeyQ", () => activatePowerByKey("ultimate"));
  new KeyPressListener("KeyI", () => activatePowerByKey("invisibility"));
  new KeyPressListener("KeyD", () => activatePowerByKey("doubleCoins"));

  document.querySelectorAll(".power-button").forEach((button) => {
    button.addEventListener("click", () => {
      const power = button.dataset.power;
      activatePowerByKey(power);
    });
  });
}
