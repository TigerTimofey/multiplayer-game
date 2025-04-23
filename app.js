import { playerColors } from "./src/core/constants/palyerColors.js";
import { handleRestart } from "./src/core/game/game-process/handleRestart.js";
import { domElements } from "./src/utils/domElements.js";
import state from "./src/core/state.js";

import { initializeLobby } from "./src/core/game/lobby/initializeLobby.js";
import { cleanupPlayer } from "./src/core/game/lobby/cleanupPlayer.js";

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
    });
})();
