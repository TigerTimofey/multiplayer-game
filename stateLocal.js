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

  gameSettings: {
    botCount: 0,
    gameMode: "",
    roundTime: 0,
    botDifficulty: "",
  },

  bots: [],

  setPlayerInfo(name, color) {
    this.playerData.name = name;
    this.playerData.color = color;

    localStorage.setItem("playerName", name);
    localStorage.setItem("playerColor", color);

    return this.playerData;
  },

  setGameSettings(botCount, gameMode, roundTime, botDifficulty = "") {
    this.gameSettings.botCount = botCount;
    this.gameSettings.gameMode = gameMode;
    this.gameSettings.roundTime = roundTime;
    this.gameSettings.botDifficulty = botDifficulty;
    return this.gameSettings;
  },

  storeBots(bots) {
    this.bots = bots;
    return this.bots;
  },

  getBots() {
    return this.bots;
  },

  setBotDifficulty(difficulty) {
    this.gameSettings.botDifficulty = difficulty;
    return this.gameSettings;
  },

  getPlayerInfo() {
    const savedName = localStorage.getItem("playerName");
    const savedColor = localStorage.getItem("playerColor");

    if (savedName) this.playerData.name = savedName;
    if (savedColor) this.playerData.color = savedColor;

    return this.playerData;
  },

  getGameSettings() {
    return this.gameSettings;
  },

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
      botDifficulty: "",
    };

    this.bots = [];
  },
};

export default StateLocal;
