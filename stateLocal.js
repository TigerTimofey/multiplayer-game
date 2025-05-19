/**
 * Local state manager for single player mode
 */
const StateLocal = {
  playerData: {
    name: "",
    color: "",
    coins: 0,
    kills: 0,
  },

  // Game settings
  gameSettings: {
    botCount: 0,
    gameMode: "",
    roundTime: 0,
  },

  // Store player information
  setPlayerInfo(name, color) {
    this.playerData.name = name;
    this.playerData.color = color;

    // Store in localStorage for persistence
    localStorage.setItem("playerName", name);
    localStorage.setItem("playerColor", color);

    return this.playerData;
  },

  // Store game settings
  setGameSettings(botCount, gameMode, roundTime) {
    this.gameSettings.botCount = botCount;
    this.gameSettings.gameMode = gameMode;
    this.gameSettings.roundTime = roundTime;
    return this.gameSettings;
  },

  // Get player data
  getPlayerInfo() {
    // Try to load from localStorage first
    const savedName = localStorage.getItem("playerName");
    const savedColor = localStorage.getItem("playerColor");

    if (savedName) this.playerData.name = savedName;
    if (savedColor) this.playerData.color = savedColor;

    return this.playerData;
  },

  // Get game settings
  getGameSettings() {
    return this.gameSettings;
  },

  // Reset all state
  resetState() {
    this.playerData = {
      name: "",
      color: "",
      coins: 0,
      kills: 0,
    };

    this.gameSettings = {
      botCount: 0,
      gameMode: "",
      roundTime: 0,
    };
  },
};

// Export the state manager
export default StateLocal;
