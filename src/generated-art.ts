/** Coordinates refer to the corrected, LLM-reviewed image files, never procedural artwork. */
export const generatedArt = {
  background: 'art/tokyo-night.png',
  atlas: 'art/night-sprites.png',
  width: 768,
  height: 512,
  frames: {
    train: [10, 112, 264, 65],
    aircraft: [289, 90, 219, 100],
    cloud: [525, 110, 235, 70],
    walkOne: [45, 292, 192, 140],
    walkTwo: [308, 300, 195, 132],
    sitting: [596, 298, 108, 139],
  },
  // Small existing illuminated rooms; darkWall is copied, never painted.
  windows: [[132, 339, 5, 10], [382, 293, 6, 8], [530, 280, 5, 8]],
  darkWall: [369, 307, 6, 10],
  stars: [[294, 10, 1, 1], [560, 12, 1, 1], [141, 17, 1, 1], [444, 22, 1, 1],
    [217, 35, 1, 1], [354, 55, 1, 1], [487, 72, 1, 1], [272, 74, 1, 1]],
  darkSky: [400, 20, 1, 1],
  railBottom: 224,
  floor: 470,
} as const;
