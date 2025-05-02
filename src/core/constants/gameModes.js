export const GAME_MODES = {
  classic: {
    name: "Classic mode",
    description: "Standard gameplay with no special rules.",
  },
  coolMode: {
    name: "Extra coins mode",
    description: "Players start with double coins and faster movement.",
    specialRules: {
      startingCoins: 70,
    },
  },
  survival: {
    name: "Hazard Mode",
    description:
      "Avoid hazards while collecting coins. Last player standing wins.",
    specialRules: {
      hazardsEnabled: true,
    },
  },
};
