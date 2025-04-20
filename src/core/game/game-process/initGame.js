import { handleArrowPress } from "../player/player-interact/movement.js";
import { activatePowerByKey } from "../player/player-interact/activatePowerByKey.js";
import state from "../../state.js";
import { domElements } from "../../../utils/domElements.js";
import { placeCoin } from "../player/player-coin-logic/coinManager.js";
import { getKeyString } from "../../../utils/helpers.js";
import { updateScoreboard } from "../../components/scoreboard/updateScoreboard.js";
import { updatePlayerPosition } from "../player/player-interact/updatePlayerPosition.js";

export function initGame() {
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
    domElements.gameContainer.removeChild(state.getCoinElements()[keyToRemove]);
    delete state.getCoinElements()[keyToRemove];
  });

  placeCoin();
  initPowers();
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
