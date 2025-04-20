import state from "../../state.js";

export function cleanupPlayer() {
  if (state.getCurrentRoomCode()) {
    const roomRef = firebase
      .database()
      .ref(
        `rooms/${state.getCurrentRoomCode()}/players/${state.getPlayerId()}`
      );
    roomRef.remove();
  }
  if (state.getPlayerRef()) {
    state.getPlayerRef().remove();
  }
}
