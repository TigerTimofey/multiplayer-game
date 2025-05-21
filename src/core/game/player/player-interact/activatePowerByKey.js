import { getRandomSafeSpot } from "../../../constants/mapData.js";
import state from "../../../state.js";
import { POWERS } from "../../../constants/powers.js";

let activePowers = {};

function showGameMessage(message) {
  let messageElement = document.querySelector(".message");

  if (!messageElement) {
    messageElement = document.createElement("div");
    messageElement.className = "message";
    document.body.appendChild(messageElement);
  }

  messageElement.textContent = message;
  messageElement.style.display = "none";

  setTimeout(() => {
    messageElement.style.display = "none";
  }, 3000);
}

export function activatePowerByKey(power) {
  const button = document.querySelector(`[data-power="${power}"]`);
  const cost = parseInt(button.dataset.cost);

  if (
    state.getPlayers()[state.getPlayerId()].coins >= cost &&
    !activePowers[power]
  ) {
    const newCoinAmount = state.getPlayers()[state.getPlayerId()].coins - cost;

    switch (power) {
      case "speed":
        const speedAudio = new Audio("./assets/audio/super-power/speed.mp3");
        speedAudio.play();

        state.getPlayerRef().update({
          coins: newCoinAmount,
          speed: 2,
        });

        firebase
          .database()
          .ref(`players/${state.getPlayerId()}/effects`)
          .set({ speed: true });

        const speedCharacterElement =
          state.getPlayerElements()[state.getPlayerId()];
        speedCharacterElement.classList.add("speed-boost");

        setTimeout(() => {
          speedCharacterElement.classList.remove("speed-boost");
          state.getPlayerRef().update({
            speed: 1,
          });

          firebase
            .database()
            .ref(`players/${state.getPlayerId()}/effects`)
            .remove();
        }, POWERS[power].duration);
        showGameMessage(
          `${
            state.getPlayers()[state.getPlayerId()].name
          } activated Speed Boost!`
        );
        break;
      case "shield":
        const shieldAudio = new Audio("./assets/audio/super-power/shield.mp3");
        shieldAudio.play();

        state.getPlayerRef().update({
          coins: newCoinAmount,
          shield: true,
        });

        firebase
          .database()
          .ref(`players/${state.getPlayerId()}/effects`)
          .set({ shield: true });

        const shieldCharacterElement =
          state.getPlayerElements()[state.getPlayerId()];
        shieldCharacterElement.classList.add("shield");

        const shieldSprite =
          shieldCharacterElement.querySelector(".Character_sprite");
        if (shieldSprite) {
          shieldSprite.style.filter = "brightness(1.2) hue-rotate(180deg)";
        }

        setTimeout(() => {
          shieldCharacterElement.classList.remove("shield");
          state.getPlayerRef().update({
            shield: false,
          });

          if (shieldSprite) {
            shieldSprite.style.filter = "";
          }

          firebase
            .database()
            .ref(`players/${state.getPlayerId()}/effects`)
            .remove();
        }, POWERS[power].duration);
        showGameMessage(
          `${state.getPlayers()[state.getPlayerId()].name} activated Shield!`
        );
        break;
      case "teleport":
        const teleportAudio = new Audio(
          "./assets/audio/super-power/teleport.mp3"
        );
        teleportAudio.play();

        const randomSpot = getRandomSafeSpot();
        state.getPlayerRef().update({
          coins: newCoinAmount,
          x: randomSpot.x,
          y: randomSpot.y,
        });
        showGameMessage(
          `${state.getPlayers()[state.getPlayerId()].name} teleported!`
        );
        break;
      case "grow":
        const giantAudio = new Audio("./assets/audio/super-power/giant.mp3");
        giantAudio.play();

        state.getPlayerRef().update({
          coins: newCoinAmount,
          isGiant: true,
          scale: 2,
        });
        const characterElement = state.getPlayerElements()[state.getPlayerId()];
        characterElement.classList.add("giant");
        characterElement.style.transform = `translate3d(${
          16 * state.getPlayers()[state.getPlayerId()].x
        }px, ${
          16 * state.getPlayers()[state.getPlayerId()].y - 4
        }px, 0) scale(2)`;
        showGameMessage(
          `${state.getPlayers()[state.getPlayerId()].name} grew in size!`
        );
        break;
      case "ultimate":
        const ultimateAudio = new Audio(
          "./assets/audio/super-power/ultimate.mp3"
        );
        ultimateAudio.play();

        ultimateAudio.addEventListener("ended", () => {
          const ultimateAudio2 = new Audio(
            "./assets/audio/super-power/ultimate2.mp3"
          );
          ultimateAudio2.play();
        });

        state.getPlayerRef().update({
          coins: newCoinAmount,
          isUltimate: true,
          isDragon: true,
          speed: 2,
          shield: true,
          scale: 2,
          damage: state.getPlayers()[state.getPlayerId()].coins * 3,
          isMagnet: true,
        });

        firebase
          .database()
          .ref(`players/${state.getPlayerId()}/effects`)
          .set({ ultimate: true });

        const ultimateCharacterElement =
          state.getPlayerElements()[state.getPlayerId()];
        ultimateCharacterElement.classList.add("dragon");

        const ultimateSprite =
          ultimateCharacterElement.querySelector(".Character_sprite");
        if (ultimateSprite) {
          ultimateSprite.style.filter =
            "brightness(1.5) saturate(2) hue-rotate(360deg)";
        }

        setTimeout(() => {
          ultimateCharacterElement.classList.remove("dragon");
          state.getPlayerRef().update({
            isUltimate: false,
            isDragon: false,
            speed: 1,
            shield: false,
            scale: 1,
            damage: null,
          });

          if (ultimateSprite) {
            ultimateSprite.style.filter = "";
          }

          firebase
            .database()
            .ref(`players/${state.getPlayerId()}/effects`)
            .remove();
        }, POWERS[power].duration);

        Object.keys(state.getCoins()).forEach((key) => {
          const [coinX, coinY] = key.split("x").map(Number);
          const coinElement = state.getCoinElements()[key];

          if (coinElement) {
            coinElement.classList.add("magnetized");
            const targetX = 16 * state.getPlayers()[state.getPlayerId()].x;
            const targetY = 16 * state.getPlayers()[state.getPlayerId()].y - 4;

            setTimeout(() => {
              coinElement.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;

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
        showGameMessage(
          `${
            state.getPlayers()[state.getPlayerId()].name
          } activated Ultimate Power!`
        );
        break;
      case "invisibility":
        const invisibilityPlay = new Audio(
          "./assets/audio/super-power/hide.mp3"
        );
        invisibilityPlay.play();

        state.getPlayerRef().update({
          coins: newCoinAmount,
          isInvisible: true,
        });

        firebase
          .database()
          .ref(`players/${state.getPlayerId()}/effects`)
          .update({ invisible: true });

        setTimeout(() => {
          state.getPlayerRef().update({
            isInvisible: false,
          });

          firebase
            .database()
            .ref(`players/${state.getPlayerId()}/effects`)
            .update({ invisible: null });
        }, POWERS[power].duration);
        showGameMessage(
          `${state.getPlayers()[state.getPlayerId()].name} became invisible!`
        );
        break;
      case "doubleCoins":
        const doubleCoinsAudio = new Audio(
          "./assets/audio/super-power/doubleCoin.mp3"
        );
        doubleCoinsAudio.play();

        state.getPlayerRef().update({
          coins: newCoinAmount,
          doubleCoins: true,
        });

        setTimeout(() => {
          state.getPlayerRef().update({
            doubleCoins: false,
          });
        }, POWERS[power].duration);
        showGameMessage(
          `${
            state.getPlayers()[state.getPlayerId()].name
          } activated Double Coins!`
        );
        break;
    }

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
