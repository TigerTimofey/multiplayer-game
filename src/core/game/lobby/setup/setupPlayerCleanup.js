import state from "../../../state.js";

export function setupPlayerCleanup(roomCode) {
  if (!roomCode) return;

  const roomRef = firebase.database().ref(`rooms/${roomCode}`);
  const playerInRoomRef = roomRef.child("players").child(state.getPlayerId());

  playerInRoomRef.onDisconnect().remove();

  roomRef.child("players").on("value", (snapshot) => {
    const players = snapshot.val() || {};
    const playerCount = Object.keys(players).length;

    roomRef.once("value").then((roomSnapshot) => {
      const roomData = roomSnapshot.val();
      if (!roomData) return;

      if (playerCount === 0) {
        roomRef.remove();
      } else {
        roomRef.update({
          currentPlayers: playerCount,
          isOpen: playerCount < roomData.maxPlayers,
        });
      }
    });
  });

  playerInRoomRef
    .onDisconnect()
    .setWithPriority({}, null)
    .then(() => {
      roomRef.child("players").off();
    });
}
