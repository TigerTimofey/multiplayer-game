import { isSolid } from "../../../../utils/helpers.js";
import { attemptGrabCoin } from "../player-coin-logic/attemptGrabCoin.js";
import { checkPlayerCollisions } from "./collisions.js";
import { mapData, getRandomSafeSpot } from "../../../constants/mapData.js";

export function handleArrowPress(
  xChange = 0,
  yChange = 0,
  {
    players,
    playerId,
    playerRef,
    coins,
    currentRoomCode,
    playerElements,
    gameOverModal,
  }
) {
  const player = players[playerId];
  if (!player || player.frozen) return;

  const speed = player.speed || 1;
  const newX = player.x + xChange * speed;
  const newY = player.y + yChange * speed;

  if (!isSolid(newX, newY)) {
    const audio = new Audio("./assets/audio/walk.mp3");
    audio.volume = 0.3;
    audio.play();

    const newDirection =
      xChange === 1
        ? "right"
        : xChange === -1
        ? "left"
        : players[playerId].direction;

    const hazardKey = `${newX}x${newY}`;
    if (mapData.hazards[hazardKey]) {
      const hitAudio = new Audio("./assets/audio/hit.mp3");
      hitAudio.play();

      const safeSpot = getRandomSafeSpot();
      playerRef.update({
        x: safeSpot.x,
        y: safeSpot.y,
        coins: 0,
      });

      const messageRef = firebase
        .database()
        .ref(`rooms/${currentRoomCode}/messages`);
      messageRef.push({
        action: `${players[playerId].name} hit a hazard and lost all coins!`,
        timestamp: Date.now(),
      });
      return;
    }

    playerRef.update({
      x: newX,
      y: newY,
      direction: newDirection,
    });

    if (players[playerId].clones) {
      const updatedClones = players[playerId].clones.map((clone, index) => {
        const angleOffset =
          (index / players[playerId].clones.length) * Math.PI * 2;
        const radius = 2;

        return {
          ...clone,
          x: newX + Math.round(Math.cos(angleOffset) * radius),
          y: newY + Math.round(Math.sin(angleOffset) * radius),
          direction: newDirection,
        };
      });

      playerRef.update({ clones: updatedClones });
    }

    attemptGrabCoin(newX, newY, {
      coins,
      playerRef,
      players,
      playerId,
      currentRoomCode,
    });
    checkPlayerCollisions(newX, newY, {
      players,
      playerId,
      playerRef,
      currentRoomCode,
      playerElements,
      gameOverModal,
    });
  }
}
