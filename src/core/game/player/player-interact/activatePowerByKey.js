import { getRandomSafeSpot } from "../../../constants/mapData.js";
import state from "../../../state.js";
import { POWERS } from "../../../constants/powers.js";

let activePowers = {};

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
        const characterElement = state.getPlayerElements()[state.getPlayerId()];
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
            const targetY = 16 * state.getPlayers()[state.getPlayerId()].y - 4;

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
