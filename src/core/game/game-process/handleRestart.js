import { getRandomSafeSpot } from "../../constants/mapData.js";
import { domElements } from "../../../utils/domElements.js";
import { randomFromArray } from "../../../utils/helpers.js";

export function handleRestart(
  playerRef,
  playerId,
  savedPlayerName,
  playerColors
) {
  domElements.gameOverModal.classList.add("hidden");
  const { x, y } = getRandomSafeSpot();

  playerRef.set({
    id: playerId,
    name: savedPlayerName,
    direction: "right",
    color: randomFromArray(playerColors),
    x,
    y,
    coins: 0,
    kills: 0,
    joinTime: Date.now(),
    startTime: Date.now(),
  });
}
