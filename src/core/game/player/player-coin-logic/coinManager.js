import { getRandomSafeSpot } from "../../../constants/mapData.js";
import { randomFromArray, getKeyString } from "../../../../utils/helpers.js";

export function placeCoin() {
  const { x, y } = getRandomSafeSpot();
  const coinRef = firebase.database().ref(`coins/${getKeyString(x, y)}`);
  coinRef.set({
    x,
    y,
  });

  const coinTimeouts = [2000, 3000, 4000, 5000];
  setTimeout(() => {
    placeCoin();
  }, randomFromArray(coinTimeouts));
}
