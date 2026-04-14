import { DESIGN_WIDTH, NUM_LANES } from '../constants.js';

export function getLaneX(laneIndex) {
  const laneWidth = DESIGN_WIDTH / NUM_LANES;
  return laneWidth * laneIndex + laneWidth / 2;
}

export function getLaneWidth() {
  return DESIGN_WIDTH / NUM_LANES;
}
