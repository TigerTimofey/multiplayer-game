export const GAME_MODES = {
  classic: {
    name: "Classic mode",
    description: "Standard gameplay with no special rules.",
    specialRules: {
      winCondition: "lastStanding",
    },
  },
  coolMode: {
    name: "Extra coins mode",
    description: "Players start with double coins and faster movement.",
    specialRules: {
      startingCoins: 10,
      winCondition: "lastStanding",
    },
  },
  survival: {
    name: "Hazard Mode",
    description:
      "Avoid hazards while collecting coins. Last player standing wins.",
    specialRules: {
      hazardsEnabled: true,
      winCondition: "lastStanding",
    },
  },
  treasureHunt: {
    name: "Treasure Hunt",
    description:
      "Store coins in treasure boxes to win. First to 25 coins wins!",
    specialRules: {
      treasureBoxesEnabled: true,
      winCondition: "treasure",
    },
  },
};
