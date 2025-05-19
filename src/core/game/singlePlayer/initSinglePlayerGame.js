import { handleSinglePlayerCollisions } from "./singlePlayerCollisions.js";
import {
  createPlayerElement,
  updatePlayerCoins,
} from "../player/playerElements.js";
import { mapData, getRandomSafeSpot } from "../../constants/mapData.js";

/**
 * Initialize the single player game with player and bots
 */
export function initSinglePlayerGame(player, bots, gameSettings) {
  // Create game state object
  const gameState = {
    player: {
      ...player,
      x: mapData.minX + 4, // Starting position
      y: mapData.minY + 2,
      direction: "right",
      coins: 0,
      kills: 0,
      element: null,
    },
    bots: bots.map((bot, index) => ({
      ...bot,
      x: getRandomSafeSpot().x,
      y: getRandomSafeSpot().y,
      direction: "right",
      element: null,
      lastMove: Date.now(),
      moveInterval: getBotMoveInterval(bot.difficulty),
      id: `bot-${index}`,
    })),
    coins: {},
    gameOver: false,
    gameTime: gameSettings.roundTime,
    timerInterval: null,
    gameContainer: document.querySelector(".game-container"),
    scoreBoard: document.querySelector("#players-list"),
  };

  // Clear the game container first
  gameState.gameContainer.innerHTML = "";

  // Initialize player element
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

  // Initialize bot elements
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

  // Place initial coins
  for (let i = 0; i < 10; i++) {
    placeCoin(gameState);
  }

  // Set up player movement controls using KeyPressListener from global scope
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

  // Set up game timer
  const timerDisplay = document.getElementById("timer-display");
  gameState.timerInterval = setInterval(() => {
    gameState.gameTime--;

    // Update time display
    const minutes = Math.floor(gameState.gameTime / 60);
    const seconds = gameState.gameTime % 60;
    timerDisplay.textContent = `${minutes}:${seconds
      .toString()
      .padStart(2, "0")}`;

    // Handle bot movement
    gameState.bots.forEach((bot) => {
      const now = Date.now();
      if (now - bot.lastMove > bot.moveInterval) {
        moveBotBasedOnDifficulty(bot, gameState);
        bot.lastMove = now;
      }
    });

    // Check for game over condition
    if (gameState.gameTime <= 0) {
      endGame(gameState);
    }
  }, 1000);

  // Update scoreboard initially
  updateScoreboard(gameState);

  // Return cleanup function
  return () => {
    keyboardListeners.forEach((listener) => listener.unbind());
    clearInterval(gameState.timerInterval);
  };
}

/**
 * Handle player movement
 */
function handlePlayerMovement(xChange, yChange, gameState) {
  if (gameState.gameOver) return;

  const player = gameState.player;
  const newX = player.x + xChange;
  const newY = player.y + yChange;

  // Check for wall collisions using mapData boundaries and blockedSpaces
  if (isValidMove(newX, newY)) {
    // Update direction for sprite facing
    player.direction =
      xChange > 0 ? "right" : xChange < 0 ? "left" : player.direction;

    // Update position
    player.x = newX;
    player.y = newY;

    // Update player element position
    updateElementPosition(player.element, player);

    // Check for coin collection
    checkCoinCollection(player, gameState);

    // Check for collisions with bots
    gameState.bots.forEach((bot) => {
      if (player.x === bot.x && player.y === bot.y) {
        handleSinglePlayerCollisions(player, bot, gameState);
      }
    });

    // Update scoreboard
    updateScoreboard(gameState);
  }
}

/**
 * Move bot based on difficulty level
 */
function moveBotBasedOnDifficulty(bot, gameState) {
  if (gameState.gameOver) return;

  let xChange = 0;
  let yChange = 0;

  switch (bot.difficulty) {
    case "easy":
      // Random movement
      const randomDir = Math.floor(Math.random() * 4);
      if (randomDir === 0) xChange = 1;
      else if (randomDir === 1) xChange = -1;
      else if (randomDir === 2) yChange = 1;
      else yChange = -1;
      break;

    case "medium":
      // Semi-intelligent movement - prioritize coins, then occasional move toward player
      const nearestCoin = findNearestCoin(bot, gameState);
      const shouldChasePlayer = Math.random() < 0.3; // 30% chance to chase player instead of coin

      if (nearestCoin && !shouldChasePlayer) {
        // Move toward coin
        const coinDiffX = nearestCoin.x - bot.x;
        const coinDiffY = nearestCoin.y - bot.y;

        if (Math.abs(coinDiffX) > Math.abs(coinDiffY)) {
          xChange = coinDiffX > 0 ? 1 : -1;
        } else {
          yChange = coinDiffY > 0 ? 1 : -1;
        }
      } else {
        // Move toward player occasionally
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
      // Smart movement - target player if bot has more coins, otherwise target coins
      // Also consider if player has significantly more coins, then chase

      const botHasMoreCoins = bot.coins > gameState.player.coins;
      const playerHasManyMoreCoins = gameState.player.coins - bot.coins > 5;

      if (botHasMoreCoins || playerHasManyMoreCoins) {
        // Chase player
        const playerDiffX = gameState.player.x - bot.x;
        const playerDiffY = gameState.player.y - bot.y;

        if (Math.abs(playerDiffX) > Math.abs(playerDiffY)) {
          xChange = playerDiffX > 0 ? 1 : -1;
        } else {
          yChange = playerDiffY > 0 ? 1 : -1;
        }
      } else {
        // Target nearest coin
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
          // Random movement if no coins
          const randomDir = Math.floor(Math.random() * 4);
          if (randomDir === 0) xChange = 1;
          else if (randomDir === 1) xChange = -1;
          else if (randomDir === 2) yChange = 1;
          else yChange = -1;
        }
      }
      break;
  }

  // Update bot direction
  bot.direction = xChange > 0 ? "right" : xChange < 0 ? "left" : bot.direction;

  // Check if the move is valid
  const newX = bot.x + xChange;
  const newY = bot.y + yChange;

  if (isValidMove(newX, newY)) {
    bot.x = newX;
    bot.y = newY;

    // Update bot element
    updateElementPosition(bot.element, bot);

    // Check for coin collection
    checkCoinCollection(bot, gameState);

    // Check for collision with player
    if (bot.x === gameState.player.x && bot.y === gameState.player.y) {
      handleSinglePlayerCollisions(gameState.player, bot, gameState);
    }

    // Update scoreboard
    updateScoreboard(gameState);
  }
}

/**
 * Get bot move interval based on difficulty
 */
function getBotMoveInterval(difficulty) {
  switch (difficulty) {
    case "easy":
      return 1200; // Slow movement
    case "medium":
      return 800; // Medium movement
    case "hard":
      return 500; // Fast movement
    default:
      return 1000;
  }
}

/**
 * Check if a move is valid using mapData boundaries and blockedSpaces
 */
function isValidMove(x, y) {
  // Check map boundaries
  if (
    x < mapData.minX ||
    x > mapData.maxX ||
    y < mapData.minY ||
    y > mapData.maxY - 1
  ) {
    return false;
  }

  // Check blocked spaces
  const key = `${x}x${y}`;
  if (mapData.blockedSpaces[key]) {
    return false;
  }

  return true;
}

/**
 * Update HTML element position based on game coordinates
 */
function updateElementPosition(element, entity) {
  element.style.transform = `translate3d(${16 * entity.x}px, ${
    16 * entity.y - 4
  }px, 0)`;
  element.setAttribute("data-direction", entity.direction);
}

/**
 * Check if entity collected a coin
 */
function checkCoinCollection(entity, gameState) {
  const coinKey = `${entity.x}x${entity.y}`;
  if (gameState.coins[coinKey]) {
    // Collect the coin
    const coin = gameState.coins[coinKey];
    entity.coins += coin.value;

    // Update coin display on character
    const coinsDisplay = entity.element.querySelector(".Character_coins");
    if (coinsDisplay) {
      coinsDisplay.textContent = ` ${entity.coins}`;
    }

    // Play coin sound
    const coinAudio = new Audio("./assets/audio/getCoin.mp3");
    coinAudio.volume = 0.5;
    coinAudio.play();

    // Remove the coin from the game
    coin.element.remove();
    delete gameState.coins[coinKey];

    // Place a new coin
    placeCoin(gameState);
  }
}

/**
 * Place a new coin in the game
 */
function placeCoin(gameState) {
  const safeSpot = getRandomSafeSpot();
  const coinKey = `${safeSpot.x}x${safeSpot.y}`;

  // Don't place a coin if there's already one there
  if (gameState.coins[coinKey]) {
    return placeCoin(gameState);
  }

  // Create coin element
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

  // Add coin to game container
  gameState.gameContainer.appendChild(coinElement);

  // Add coin to game state
  gameState.coins[coinKey] = {
    x: safeSpot.x,
    y: safeSpot.y,
    value: 1,
    element: coinElement,
  };
}

/**
 * Find the nearest coin to an entity
 */
function findNearestCoin(entity, gameState) {
  let nearestCoin = null;
  let nearestDistance = Infinity;

  Object.values(gameState.coins).forEach((coin) => {
    const distance = Math.abs(entity.x - coin.x) + Math.abs(entity.y - coin.y);
    if (distance < nearestDistance) {
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

  // Add player score
  const playerScore = document.createElement("div");
  playerScore.className = "player-score you";
  playerScore.innerHTML = `
    <span>${gameState.player.name}</span>
    <span>${gameState.player.coins}</span>
    <span>${gameState.player.kills}</span>
  `;
  scoreboardElement.appendChild(playerScore);

  // Add bot scores
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

/**
 * End the game and show results
 */
function endGame(gameState) {
  gameState.gameOver = true;
  clearInterval(gameState.timerInterval);

  // Determine winner
  let winner = gameState.player;
  let allEntities = [gameState.player, ...gameState.bots];

  allEntities.forEach((entity) => {
    if (entity.coins > winner.coins) {
      winner = entity;
    }
  });

  // Show game over modal
  const gameOverModal = document.getElementById("game-over-modal");
  const eliminatedByText = document.getElementById("eliminated-by");

  if (winner === gameState.player) {
    eliminatedByText.textContent = "You win! You collected the most coins.";
  } else {
    eliminatedByText.textContent = `${winner.name} wins with ${winner.coins} coins!`;
  }

  gameOverModal.classList.remove("hidden");

  // Add event listener for restart button
  document.getElementById("restart-button").addEventListener("click", () => {
    gameOverModal.classList.add("hidden");
    window.location.reload(); // Reload the page to restart the game
  });
}
