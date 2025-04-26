import { handleArrowPress } from "../player/player-interact/movement.js";
import { activatePowerByKey } from "../player/player-interact/activatePowerByKey.js";
import state from "../../state.js";
import { domElements } from "../../../utils/domElements.js";
import { placeCoin } from "../player/player-coin-logic/coinManager.js";
import { getKeyString } from "../../../utils/helpers.js";
import { updateScoreboard } from "../../components/scoreboard/updateScoreboard.js";
import { updatePlayerPosition } from "../player/player-interact/updatePlayerPosition.js";

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
        document.querySelector(
          "#eliminated-by"
        ).textContent = `Eliminated by ${characterState.defeatedBy.name} who had ${characterState.defeatedBy.coins} coins!`;
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
    optionsModal.classList.add("hidden");
    window.location.href = "/";
    logActionToFirebase("Quit the game");
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
    const { playerId, action } = snapshot.val();
    const playerName = state.getPlayers()[playerId]?.name || "Unknown Player";
    displayMessage(`${playerName} ${action}`);
  });
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

  document.querySelectorAll(".power-button").forEach((button) => {
    button.addEventListener("click", () => {
      const power = button.dataset.power;
      activatePowerByKey(power);
    });
  });
}
