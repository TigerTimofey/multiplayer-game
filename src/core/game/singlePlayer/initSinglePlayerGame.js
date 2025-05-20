import { handleSinglePlayerCollisions } from "./singlePlayerCollisions.js";
import {
  createPlayerElement,
  updatePlayerCoins,
} from "../player/playerElements.js";
import { mapData, getRandomSafeSpot } from "../../constants/mapData.js";
import { POWERS } from "../../constants/powers.js";

/**
 * Initialize the single player game with player and bots
 */
export function initSinglePlayerGame(player, bots, gameSettings) {
  // Add single-player-active class to body to hide certain powers
  document.body.classList.add("single-player-active");

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
      // Added powers-related properties
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

  // Add power controls
  keyboardListeners.push(
    new KeyPressListener("KeyW", () => activatePower("speed", gameState))
  );
  keyboardListeners.push(
    new KeyPressListener("KeyE", () => activatePower("shield", gameState))
  );
  keyboardListeners.push(
    new KeyPressListener("KeyR", () => activatePower("teleport", gameState))
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
    // Remove single-player mode class when game ends
    document.body.classList.remove("single-player-active");
  };
}

/**
 * Handle player movement
 */
function handlePlayerMovement(xChange, yChange, gameState) {
  if (gameState.gameOver) return;

  const player = gameState.player;

  // Apply speed modifier to movement if speed power is active
  const speedMultiplier = player.speed || 1;
  const adjustedXChange = xChange * speedMultiplier;
  const adjustedYChange = yChange * speedMultiplier;

  // When speed is active, we need to process each step of movement separately
  // to ensure collision detection works properly for each grid cell crossed
  let remainingXChange = adjustedXChange;
  let remainingYChange = adjustedYChange;

  // Process movement in steps of 1 grid cell at a time
  while (Math.abs(remainingXChange) > 0 || Math.abs(remainingYChange) > 0) {
    // Calculate the next step
    const stepX = remainingXChange > 0 ? 1 : remainingXChange < 0 ? -1 : 0;
    const stepY = remainingYChange > 0 ? 1 : remainingYChange < 0 ? -1 : 0;

    // Calculate new position for this step
    const newX = player.x + stepX;
    const newY = player.y + stepY;

    // Check if this step is valid
    if (isValidMove(newX, newY)) {
      // Update direction for sprite facing if moving horizontally
      if (stepX !== 0) {
        player.direction = stepX > 0 ? "right" : "left";
      }

      // Update position
      player.x = newX;
      player.y = newY;

      // Update visual position
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

      // Subtract the step from remaining change
      remainingXChange -= stepX;
      remainingYChange -= stepY;
    } else {
      // If this step is invalid, stop movement in this direction
      remainingXChange = 0;
      remainingYChange = 0;
      break;
    }
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

    // Check for collisions with other bots
    gameState.bots.forEach((otherBot) => {
      if (
        bot.id !== otherBot.id &&
        bot.x === otherBot.x &&
        bot.y === otherBot.y
      ) {
        handleBotVsBotCollision(bot, otherBot, gameState);
      }
    });

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
    x > mapData.maxX - 1 ||
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

/**
 * Activate player power
 */
function activatePower(power, gameState) {
  const button = document.querySelector(`[data-power="${power}"]`);
  const cost = parseInt(button.dataset.cost);
  const player = gameState.player;

  // Check if player has enough coins and power is not on cooldown
  if (player.coins >= cost && !player.powers[power].cooldown) {
    // Deduct coins
    player.coins -= cost;

    // Update coin display on player character
    const coinsDisplay = player.element.querySelector(".Character_coins");
    if (coinsDisplay) {
      coinsDisplay.textContent = ` ${player.coins}`;
    }

    // Update scoreboard immediately to reflect the new coin count
    updateScoreboard(gameState);

    // Update power status
    player.powers[power].active = true;
    player.powers[power].cooldown = true;

    // Update UI
    button.classList.add("active");
    const cooldown = button.querySelector(".cooldown");
    if (cooldown) {
      cooldown.style.setProperty("--progress", "100%");
    }

    // Process power activation
    switch (power) {
      case "speed":
        // Play speed sound
        const speedAudio = new Audio("./assets/audio/super-power/speed.mp3");
        speedAudio.volume = 0.5;
        speedAudio.play();

        // Apply speed effect
        player.speed = 2; // This now affects actual movement speed
        player.element.classList.add("speed-boost");

        // Set timeout to end the effect
        setTimeout(() => {
          player.speed = 1;
          player.powers[power].active = false;
          player.element.classList.remove("speed-boost");
          button.classList.remove("active");

          // Start cooldown animation
          startCooldownAnimation(power, button, gameState);
        }, POWERS[power].duration);
        break;

      case "shield":
        // Play shield sound
        const shieldAudio = new Audio("./assets/audio/super-power/shield.mp3");
        shieldAudio.volume = 0.5;
        shieldAudio.play();

        // Apply shield effect
        player.shield = true;
        player.element.classList.add("shield");

        // Don't change the position/shadow when adding shield

        // Set timeout to end the effect
        setTimeout(() => {
          player.shield = false;
          player.powers[power].active = false;
          player.element.classList.remove("shield");
          button.classList.remove("active");

          // Start cooldown animation
          startCooldownAnimation(power, button, gameState);
        }, POWERS[power].duration);
        break;

      case "teleport":
        // Play teleport sound
        const teleportAudio = new Audio(
          "./assets/audio/super-power/teleport.mp3"
        );
        teleportAudio.volume = 0.5;
        teleportAudio.play();

        // Get a random safe spot and teleport player
        const safeSpot = getRandomSafeSpot();
        player.x = safeSpot.x;
        player.y = safeSpot.y;
        updateElementPosition(player.element, player);
        button.classList.remove("active");

        // Start cooldown animation
        startCooldownAnimation(power, button, gameState);
        break;
    }
  }
}

/**
 * Start cooldown animation for a power
 */
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

/**
 * Handle collisions between two bots
 */
function handleBotVsBotCollision(bot1, bot2, gameState) {
  // Play hit sound
  const hitAudio = new Audio("./assets/audio/hit.mp3");
  hitAudio.play();

  // Determine which bot has more coins and is the winner
  const winner = bot1.coins > bot2.coins ? bot1 : bot2;
  const loser = bot1.coins > bot2.coins ? bot2 : bot1;

  // Reset loser's position and coins
  const safeSpot = getRandomSafeSpot();
  loser.x = safeSpot.x;
  loser.y = safeSpot.y;
  loser.coins = 0; // Reset loser coins immediately

  // Update winner's kills
  winner.kills++;

  // Update loser's position in the DOM
  updateElementPosition(loser.element, loser);

  // Update coins display on loser character
  const loserCoinsDisplay = loser.element.querySelector(".Character_coins");
  if (loserCoinsDisplay) {
    loserCoinsDisplay.textContent = ` 0`; // Update visual display immediately
  }

  // Show a message
  showGameMessage(`${winner.name} defeated ${loser.name}!`);

  // Update scoreboard immediately
  updateScoreboard(gameState);
}

/**
 * Show a temporary game message
 */
function showGameMessage(message) {
  let messageElement = document.querySelector(".message");

  if (!messageElement) {
    messageElement = document.createElement("div");
    messageElement.className = "message";
    document.body.appendChild(messageElement);
  }

  messageElement.textContent = message;
  messageElement.style.display = "block";

  // Remove the message after 3 seconds
  setTimeout(() => {
    messageElement.style.display = "none";
  }, 3000);
}
