import state from "../../state.js";

export function handlePlayerLeave(roomCode) {
  if (!roomCode) return;

  firebase
    .database()
    .ref(`rooms/${roomCode}/players/${state.getPlayerId()}`)
    .remove();

  firebase
    .database()
    .ref(`rooms/${roomCode}`)
    .transaction((room) => {
      if (!room) return null;
      const newPlayerCount = Math.max(0, (room.currentPlayers || 1) - 1);
      return {
        ...room,
        currentPlayers: newPlayerCount,
        isOpen: newPlayerCount < room.maxPlayers,
      };
    });
}
