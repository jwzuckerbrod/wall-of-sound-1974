/**
 * The equipment marks as pure data, shared by the browser's canvas textures
 * and the Blender scene (scripts/export-scene.mjs writes them to scene.json).
 */

/**
 * The bolt's outline, traced from Bob Thomas's own drawing of it (the circle
 * inside the Steal Your Face artwork, where it runs rim to rim) and expressed
 * in units of the colored field's radius, y down. Top tip first, down the blue
 * side, back up the red side. Traced rather than drawn freehand: a hand-built
 * sawtooth came out as a staircase and read as an imitation. Where the
 * low-resolution source rounded a tooth into two or three vertices, the one
 * farthest from the bolt's center line is kept, which restores the point.
 */
export const BOLT: readonly [number, number][] = [
  [0.468, -0.858], [0.496, -0.816], [0.383, -0.603], [0.553, -0.603], [0.255, -0.362],
  [0.553, -0.305], [0.142, -0.021], [0.482, -0.007], [0.27, 0.149], [0.043, 0.262],
  [0.34, 0.305], [-0.071, 0.532], [0.028, 0.574], [-0.241, 0.688], [-0.199, 0.759],
  [-0.468, 0.858], [-0.482, 0.801], [-0.27, 0.418], [-0.468, 0.404], [-0.17, 0.163],
  [-0.44, 0.135], [0.014, -0.177], [-0.27, -0.206], [-0.014, -0.362], [0.184, -0.475],
  [0.028, -0.489], [-0.043, -0.532], [0.355, -0.702], [0.255, -0.759],
];
/** Index of the bottom tip: BOLT[0..BOTTOM] is the blue edge, the rest the red. */
export const BOLT_BOTTOM = 15;
