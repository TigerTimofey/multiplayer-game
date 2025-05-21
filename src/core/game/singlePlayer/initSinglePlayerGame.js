import { handleSinglePlayerCollisions } from "./singlePlayerCollisions.js";
import {
  createPlayerElement,
  updatePlayerCoins,
} from "../player/playerElements.js";
import { mapData, getRandomSafeSpot } from "../../constants/mapData.js";
import { POWERS } from "../../constants/powers.js";

export function initSinglePlayerGame(player, bots, gameSettings) {
  document.body.classList.add("single-player-active");

  const shieldButton = document.querySelector('[data-power="shield"]');
  if (shieldButton) {
    const nameElement = shieldButton.querySelector(".power-name");
    const costElement = shieldButton.querySelector(".cost");

    if (nameElement) nameElement.textContent = "Strength";
    if (costElement) costElement.textContent = "10 coins";

    shieldButton.setAttribute("data-cost", "10");
  }

  const gameState = {
    player: {
      ...player,
      x: mapData.minX + 4,
      y: mapData.minY + 2,
      direction: "right",
      coins: 0,
      kills: 0,
      element: null,
      speed: 1,
      shield: false,
      powers: {
        speed: {
          active: false,
          cooldown: false,
        },
        shield: {
          active: false,
          cooldown: false,
        },
        teleport: {
          active: false,
          cooldown: false,
        },
      },
    },
    bots: bots.map((bot, index) => {
      const botProps = getBotProperties(bot.difficulty);

      return {
        ...bot,
        x: getRandomSafeSpot().x,
        y: getRandomSafeSpot().y,
        direction: "right",
        element: null,
        lastMove: Date.now(),
        moveInterval: botProps.moveInterval,
        coinPriority: botProps.coinPriority,
        playerChaseChance: botProps.playerChaseChance,
        intelligenceLevel: botProps.intelligenceLevel,
        id: `bot-${index}`,
      };
    }),
    coins: {},
    gameOver: false,
    gameTime: gameSettings.roundTime,
    timerInterval: null,
    gameContainer: document.querySelector(".game-container"),
    scoreBoard: document.querySelector("#players-list"),
  };

  gameState.gameContainer.innerHTML = "";

  const playerElement = createPlayerElement(
    gameState.player.name,
    gameState.player.x,
    gameState.player.y,
    gameState.player.direction,
    gameState.player.color,
    true
  );

  gameState.gameContainer.appendChild(playerElement);
  gameState.player.element = playerElement;

  gameState.bots.forEach((bot) => {
    const botElement = createPlayerElement(
      bot.name,
      bot.x,
      bot.y,
      bot.direction,
      bot.color,
      false
    );

    gameState.gameContainer.appendChild(botElement);
    bot.element = botElement;
  });

  for (let i = 0; i < 10; i++) {
    placeCoin(gameState);
  }

  const keyboardListeners = [];

  keyboardListeners.push(
    new KeyPressListener("ArrowUp", () =>
      handlePlayerMovement(0, -1, gameState)
    )
  );
  keyboardListeners.push(
    new KeyPressListener("ArrowDown", () =>
      handlePlayerMovement(0, 1, gameState)
    )
  );
  keyboardListeners.push(
    new KeyPressListener("ArrowLeft", () =>
      handlePlayerMovement(-1, 0, gameState)
    )
  );
  keyboardListeners.push(
    new KeyPressListener("ArrowRight", () =>
      handlePlayerMovement(1, 0, gameState)
    )
  );

  keyboardListeners.push(
    new KeyPressListener("KeyW", () => activatePower("speed", gameState))
  );
  keyboardListeners.push(
    new KeyPressListener("KeyE", () => activatePower("shield", gameState))
  );
  keyboardListeners.push(
    new KeyPressListener("KeyR", () => activatePower("teleport", gameState))
  );

  const timerDisplay = document.getElementById("timer-display");
  gameState.timerInterval = setInterval(() => {
    gameState.gameTime--;

    const minutes = Math.floor(gameState.gameTime / 60);
    const seconds = gameState.gameTime % 60;
    timerDisplay.textContent = `${minutes}:${seconds
      .toString()
      .padStart(2, "0")}`;

    gameState.bots.forEach((bot) => {
      const now = Date.now();
      if (now - bot.lastMove > bot.moveInterval) {
        moveBotBasedOnDifficulty(bot, gameState);
        bot.lastMove = now;
      }
    });

    if (gameState.gameTime <= 0) {
      endGame(gameState);
    }
  }, 1000);

  updateScoreboard(gameState);

  return () => {
    keyboardListeners.forEach((listener) => listener.unbind());
    clearInterval(gameState.timerInterval);

    document.body.classList.remove("single-player-active");
  };
}

function handlePlayerMovement(xChange, yChange, gameState) {
  if (gameState.gameOver) return;

  const player = gameState.player;

  const speedMultiplier = player.speed || 1;
  const adjustedXChange = xChange * speedMultiplier;
  const adjustedYChange = yChange * speedMultiplier;

  let remainingXChange = adjustedXChange;
  let remainingYChange = adjustedYChange;

  while (Math.abs(remainingXChange) > 0 || Math.abs(remainingYChange) > 0) {
    const stepX = remainingXChange > 0 ? 1 : remainingXChange < 0 ? -1 : 0;
    const stepY = remainingYChange > 0 ? 1 : remainingYChange < 0 ? -1 : 0;

    const newX = player.x + stepX;
    const newY = player.y + stepY;

    if (isValidMove(newX, newY)) {
      if (stepX !== 0) {
        player.direction = stepX > 0 ? "right" : "left";
      }

      player.x = newX;
      player.y = newY;

      updateElementPosition(player.element, player);

      checkCoinCollection(player, gameState);

      gameState.bots.forEach((bot) => {
        if (player.x === bot.x && player.y === bot.y) {
          handleSinglePlayerCollisions(player, bot, gameState);
        }
      });

      updateScoreboard(gameState);

      remainingXChange -= stepX;
      remainingYChange -= stepY;
    } else {
      remainingXChange = 0;
      remainingYChange = 0;
      break;
    }
  }
}

function getBotProperties(difficulty) {
  switch (difficulty) {
    case "easy":
      return {
        moveInterval: 1700,
        coinPriority: 0.4,
        playerChaseChance: 0.1,
        intelligenceLevel: "low",
        description: "Slow and mostly random movement. Rarely chases players.",
      };

    case "medium":
      return {
        moveInterval: 1200,
        coinPriority: 0.7,
        playerChaseChance: 0.3,
        intelligenceLevel: "medium",
        description:
          "Balanced speed with improved coin targeting. Sometimes chases players.",
      };

    case "hard":
      return {
        moveInterval: 50,
        coinPriority: 0.9,
        playerChaseChance: 0.9,
        intelligenceLevel: "high",
        description:
          "Fast movement with smart targeting. Aggressively pursues coins and players.",
      };

    default:
      return {
        moveInterval: 1000,
        coinPriority: 0.5,
        playerChaseChance: 0.2,
        intelligenceLevel: "medium",
        description: "Default balanced behavior",
      };
  }
}

function moveBotBasedOnDifficulty(bot, gameState) {
  if (gameState.gameOver) return;

  let xChange = 0;
  let yChange = 0;

  switch (bot.difficulty) {
    case "easy":
      if (Math.random() < bot.coinPriority) {
        const nearestCoin = findNearestCoin(bot, gameState);
        if (nearestCoin) {
          const coinDiffX = nearestCoin.x - bot.x;
          const coinDiffY = nearestCoin.y - bot.y;

          if (Math.abs(coinDiffX) > Math.abs(coinDiffY)) {
            xChange = coinDiffX > 0 ? 1 : -1;
          } else {
            yChange = coinDiffY > 0 ? 1 : -1;
          }
        } else {
          const randomDir = Math.floor(Math.random() * 4);
          if (randomDir === 0) xChange = 1;
          else if (randomDir === 1) xChange = -1;
          else if (randomDir === 2) yChange = 1;
          else yChange = -1;
        }
      } else {
        const randomDir = Math.floor(Math.random() * 4);
        if (randomDir === 0) xChange = 1;
        else if (randomDir === 1) xChange = -1;
        else if (randomDir === 2) yChange = 1;
        else yChange = -1;
      }
      break;

    case "medium":
      const nearestCoin = findNearestCoin(bot, gameState);
      const shouldChasePlayer = Math.random() < bot.playerChaseChance;

      if (nearestCoin && !shouldChasePlayer) {
        const coinDiffX = nearestCoin.x - bot.x;
        const coinDiffY = nearestCoin.y - bot.y;

        if (Math.abs(coinDiffX) > Math.abs(coinDiffY)) {
          xChange = coinDiffX > 0 ? 1 : -1;
        } else {
          yChange = coinDiffY > 0 ? 1 : -1;
        }
      } else {
        const playerDiffX = gameState.player.x - bot.x;
        const playerDiffY = gameState.player.y - bot.y;

        if (Math.abs(playerDiffX) > Math.abs(playerDiffY)) {
          xChange = playerDiffX > 0 ? 1 : -1;
        } else {
          yChange = playerDiffY > 0 ? 1 : -1;
        }
      }
      break;

    case "hard":
      const botHasMoreCoins = bot.coins > gameState.player.coins;
      const playerHasManyMoreCoins = gameState.player.coins - bot.coins > 5;
      const coinIsNearby = findNearestCoin(bot, gameState, 5);

      if (
        (botHasMoreCoins && Math.random() < bot.playerChaseChance) ||
        playerHasManyMoreCoins
      ) {
        const playerDiffX = gameState.player.x - bot.x;
        const playerDiffY = gameState.player.y - bot.y;

        if (Math.abs(playerDiffX) > Math.abs(playerDiffY)) {
          xChange = playerDiffX > 0 ? 1 : -1;
          if (!isValidMove(bot.x + xChange, bot.y)) {
            xChange = 0;
            yChange = playerDiffY > 0 ? 1 : -1;
          }
        } else {
          yChange = playerDiffY > 0 ? 1 : -1;
          if (!isValidMove(bot.x, bot.y + yChange)) {
            yChange = 0;
            xChange = playerDiffX > 0 ? 1 : -1;
          }
        }
      } else if (coinIsNearby) {
        const coinDiffX = coinIsNearby.x - bot.x;
        const coinDiffY = coinIsNearby.y - bot.y;

        if (Math.abs(coinDiffX) > Math.abs(coinDiffY)) {
          xChange = coinDiffX > 0 ? 1 : -1;
          if (!isValidMove(bot.x + xChange, bot.y)) {
            xChange = 0;
            yChange = coinDiffY > 0 ? 1 : -1;
          }
        } else {
          yChange = coinDiffY > 0 ? 1 : -1;
          if (!isValidMove(bot.x, bot.y + yChange)) {
            yChange = 0;
            xChange = coinDiffX > 0 ? 1 : -1;
          }
        }
      } else {
        const potentialDirections = [
          { x: 1, y: 0 },
          { x: -1, y: 0 },
          { x: 0, y: 1 },
          { x: 0, y: -1 },
        ];

        let bestDirection = null;
        let bestScore = -Infinity;

        for (const dir of potentialDirections) {
          if (isValidMove(bot.x + dir.x, bot.y + dir.y)) {
            let score = Math.random() * 0.2;

            Object.values(gameState.coins).forEach((coin) => {
              const currentDist =
                Math.abs(bot.x - coin.x) + Math.abs(bot.y - coin.y);
              const newDist =
                Math.abs(bot.x + dir.x - coin.x) +
                Math.abs(bot.y + dir.y - coin.y);
              if (newDist < currentDist) {
                score += 1;
              }
            });

            if (botHasMoreCoins) {
              const playerDist =
                Math.abs(bot.x + dir.x - gameState.player.x) +
                Math.abs(bot.y + dir.y - gameState.player.y);
              if (playerDist < 3) {
                score -= 2;
              }
            }

            if (score > bestScore) {
              bestScore = score;
              bestDirection = dir;
            }
          }
        }

        if (bestDirection) {
          xChange = bestDirection.x;
          yChange = bestDirection.y;
        } else {
          const randomDir = Math.floor(Math.random() * 4);
          if (randomDir === 0) xChange = 1;
          else if (randomDir === 1) xChange = -1;
          else if (randomDir === 2) yChange = 1;
          else yChange = -1;
        }
      }
      break;
  }

  bot.direction = xChange > 0 ? "right" : xChange < 0 ? "left" : bot.direction;

  const newX = bot.x + xChange;
  const newY = bot.y + yChange;

  if (isValidMove(newX, newY)) {
    bot.x = newX;
    bot.y = newY;

    updateElementPosition(bot.element, bot);

    checkCoinCollection(bot, gameState);

    if (bot.x === gameState.player.x && bot.y === gameState.player.y) {
      handleSinglePlayerCollisions(gameState.player, bot, gameState);
    }

    gameState.bots.forEach((otherBot) => {
      if (
        bot.id !== otherBot.id &&
        bot.x === otherBot.x &&
        bot.y === otherBot.y
      ) {
        handleBotVsBotCollision(bot, otherBot, gameState);
      }
    });

    updateScoreboard(gameState);
  }
}

function isValidMove(x, y) {
  if (
    x < mapData.minX ||
    x > mapData.maxX - 1 ||
    y < mapData.minY ||
    y > mapData.maxY - 1
  ) {
    return false;
  }

  const key = `${x}x${y}`;
  if (mapData.blockedSpaces[key]) {
    return false;
  }

  return true;
}

function updateElementPosition(element, entity) {
  element.style.transform = `translate3d(${16 * entity.x}px, ${
    16 * entity.y - 4
  }px, 0)`;
  element.setAttribute("data-direction", entity.direction);
}

function checkCoinCollection(entity, gameState) {
  const coinKey = `${entity.x}x${entity.y}`;
  if (gameState.coins[coinKey]) {
    const coin = gameState.coins[coinKey];
    entity.coins += coin.value;

    const coinsDisplay = entity.element.querySelector(".Character_coins");
    if (coinsDisplay) {
      coinsDisplay.textContent = ` ${entity.coins}`;
    }

    const coinAudio = new Audio("./assets/audio/getCoin.mp3");
    coinAudio.volume = 0.5;
    coinAudio.play();

    coin.element.remove();
    delete gameState.coins[coinKey];

    placeCoin(gameState);
  }
}

function placeCoin(gameState) {
  const safeSpot = getRandomSafeSpot();
  const coinKey = `${safeSpot.x}x${safeSpot.y}`;

  if (gameState.coins[coinKey]) {
    return placeCoin(gameState);
  }

  const coinElement = document.createElement("div");
  coinElement.classList.add("Coin", "grid-cell");

  const coinSprite = document.createElement("div");
  coinSprite.classList.add("Coin_sprite", "grid-cell");

  const coinShadow = document.createElement("div");
  coinShadow.classList.add("Coin_shadow", "grid-cell");

  coinElement.appendChild(coinSprite);
  coinElement.appendChild(coinShadow);

  coinElement.style.transform = `translate3d(${16 * safeSpot.x}px, ${
    16 * safeSpot.y - 4
  }px, 0)`;

  gameState.gameContainer.appendChild(coinElement);

  gameState.coins[coinKey] = {
    x: safeSpot.x,
    y: safeSpot.y,
    value: 1,
    element: coinElement,
  };
}

function findNearestCoin(entity, gameState, maxDistance = Infinity) {
  let nearestCoin = null;
  let nearestDistance = Infinity;

  Object.values(gameState.coins).forEach((coin) => {
    const distance = Math.abs(entity.x - coin.x) + Math.abs(entity.y - coin.y);
    if (distance < nearestDistance && distance <= maxDistance) {
      nearestDistance = distance;
      nearestCoin = coin;
    }
  });

  return nearestCoin;
}

/**
 * Update the scoreboard with current player and bot stats
 */
function updateScoreboard(gameState) {
  const scoreboardElement = gameState.scoreBoard;
  scoreboardElement.innerHTML = `
    <div class="scoreboard-header">
      <span>Name</span>
      <span>Coins</span>
      <span>Kills</span>
    </div>
  `;

  const playerScore = document.createElement("div");
  playerScore.className = "player-score you";
  playerScore.innerHTML = `
    <span>${gameState.player.name}</span>
    <span>${gameState.player.coins}</span>
    <span>${gameState.player.kills}</span>
  `;
  scoreboardElement.appendChild(playerScore);

  gameState.bots.forEach((bot) => {
    const botScore = document.createElement("div");
    botScore.className = "player-score";
    botScore.innerHTML = `
      <span>${bot.name}</span>
      <span>${bot.coins}</span>
      <span>${bot.kills}</span>
    `;
    scoreboardElement.appendChild(botScore);
  });
}

function endGame(gameState) {
  gameState.gameOver = true;
  clearInterval(gameState.timerInterval);

  let coinWinner = gameState.player;
  let killsWinner = gameState.player;
  let allEntities = [gameState.player, ...gameState.bots];

  allEntities.forEach((entity) => {
    if (entity.coins > coinWinner.coins) {
      coinWinner = entity;
    }
    if (entity.kills > killsWinner.kills) {
      killsWinner = entity;
    }
  });

  const gameOverModal = document.getElementById("game-over-modal");
  const eliminatedByText = document.getElementById("eliminated-by");

  let gameOverText = "";

  if (coinWinner === gameState.player) {
    gameOverText += `You collected the most coins: ${coinWinner.coins}!`;
  } else {
    gameOverText += `${coinWinner.name} collected the most coins: ${coinWinner.coins}!`;
  }

  if (killsWinner === gameState.player) {
    gameOverText += `\nYou got the most kills: ${killsWinner.kills}!`;
  } else {
    gameOverText += `\n${killsWinner.name} got the most kills: ${killsWinner.kills}!`;
  }

  eliminatedByText.textContent = gameOverText;

  eliminatedByText.style.whiteSpace = "pre-line";

  gameOverModal.classList.remove("hidden");

  const restartButton = document.getElementById("restart-button");
  restartButton.textContent = "To Lobby";
  restartButton.addEventListener("click", () => {
    gameOverModal.classList.add("hidden");
    window.location.reload();
  });
}

function activatePower(power, gameState) {
  const button = document.querySelector(`[data-power="${power}"]`);
  const cost = parseInt(button.dataset.cost);
  const player = gameState.player;

  if (player.coins >= cost && !player.powers[power].cooldown) {
    player.coins -= cost;

    const coinsDisplay = player.element.querySelector(".Character_coins");
    if (coinsDisplay) {
      coinsDisplay.textContent = ` ${player.coins}`;
    }

    updateScoreboard(gameState);

    player.powers[power].active = true;
    player.powers[power].cooldown = true;

    button.classList.add("active");
    const cooldown = button.querySelector(".cooldown");
    if (cooldown) {
      cooldown.style.setProperty("--progress", "100%");
    }

    switch (power) {
      case "speed":
        const speedAudio = new Audio("./assets/audio/super-power/speed.mp3");
        speedAudio.volume = 0.5;
        speedAudio.play();

        player.speed = 2;
        player.element.classList.add("speed-boost");

        setTimeout(() => {
          player.speed = 1;
          player.powers[power].active = false;
          player.element.classList.remove("speed-boost");
          button.classList.remove("active");

          startCooldownAnimation(power, button, gameState);
        }, POWERS[power].duration);
        break;

      case "shield":
        const shieldAudio = new Audio("./assets/audio/super-power/shield.mp3");
        shieldAudio.volume = 0.5;
        shieldAudio.play();

        player.shield = true;
        player.element.classList.add("shield");

        setTimeout(() => {
          player.shield = false;
          player.powers[power].active = false;
          player.element.classList.remove("shield");
          button.classList.remove("active");

          startCooldownAnimation(power, button, gameState);
        }, POWERS[power].duration);
        break;

      case "teleport":
        const teleportAudio = new Audio(
          "./assets/audio/super-power/teleport.mp3"
        );
        teleportAudio.volume = 0.5;
        teleportAudio.play();

        const safeSpot = getRandomSafeSpot();
        player.x = safeSpot.x;
        player.y = safeSpot.y;
        updateElementPosition(player.element, player);
        button.classList.remove("active");

        startCooldownAnimation(power, button, gameState);
        break;
    }
  }
}

function startCooldownAnimation(power, button, gameState) {
  const cooldown = button.querySelector(".cooldown");
  const cooldownTime = POWERS[power].cooldown;
  const startTime = Date.now();

  const updateCooldown = () => {
    const elapsedTime = Date.now() - startTime;
    const remainingPercentage = Math.max(
      0,
      100 - (elapsedTime / cooldownTime) * 100
    );

    if (cooldown) {
      cooldown.style.setProperty("--progress", `${remainingPercentage}%`);
    }

    if (remainingPercentage > 0) {
      requestAnimationFrame(updateCooldown);
    } else {
      gameState.player.powers[power].cooldown = false;
    }
  };

  updateCooldown();
}

function handleBotVsBotCollision(bot1, bot2, gameState) {
  const hitAudio = new Audio("./assets/audio/hit.mp3");
  hitAudio.play();

  const winner = bot1.coins > bot2.coins ? bot1 : bot2;
  const loser = bot1.coins > bot2.coins ? bot2 : bot1;

  const safeSpot = getRandomSafeSpot();
  loser.x = safeSpot.x;
  loser.y = safeSpot.y;
  loser.coins = 0;

  winner.kills++;

  updateElementPosition(loser.element, loser);

  const loserCoinsDisplay = loser.element.querySelector(".Character_coins");
  if (loserCoinsDisplay) {
    loserCoinsDisplay.textContent = ` 0`;
  }

  showGameMessage(`${winner.name} defeated ${loser.name}!`);

  updateScoreboard(gameState);
}

function showGameMessage(message) {
  let messageElement = document.querySelector(".message");

  if (!messageElement) {
    messageElement = document.createElement("div");
    messageElement.className = "message";
    document.body.appendChild(messageElement);
  }

  messageElement.textContent = message;
  messageElement.style.display = "block";

  setTimeout(() => {
    messageElement.style.display = "none";
  }, 3000);
}
