const state = {
  playerId: null,
  playerRef: null,
  currentRoomCode: null,
  players: {},
  playerElements: {},
  coins: {},
  coinElements: {},
  savedPlayerName: "",
  savedPlayerColor: "",

  setPlayerId(id) {
    this.playerId = id;
  },
  getPlayerId() {
    return this.playerId;
  },

  setPlayerRef(ref) {
    this.playerRef = ref;
  },
  getPlayerRef() {
    return this.playerRef;
  },

  setCurrentRoomCode(code) {
    this.currentRoomCode = code;
  },
  getCurrentRoomCode() {
    return this.currentRoomCode;
  },

  setPlayers(players) {
    this.players = players;
  },
  getPlayers() {
    return this.players;
  },

  setPlayerElements(elements) {
    this.playerElements = elements;
  },
  getPlayerElements() {
    return this.playerElements;
  },

  setCoins(coins) {
    this.coins = coins;
  },
  getCoins() {
    return this.coins;
  },

  setCoinElements(elements) {
    this.coinElements = elements;
  },
  getCoinElements() {
    return this.coinElements;
  },

  setSavedPlayerName(name) {
    this.savedPlayerName = name;
  },
  getSavedPlayerName() {
    return this.savedPlayerName;
  },

  setSavedPlayerColor(color) {
    this.savedPlayerColor = color;
  },
  getSavedPlayerColor() {
    return this.savedPlayerColor;
  },
};

export default state;
