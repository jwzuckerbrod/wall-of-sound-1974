/**
 * Turns the array blocks in wall.config into one transform per driver.
 *
 * Pure functions, no three.js: the renderer feeds these into InstancedMesh, and
 * scripts/verify.mjs checks them without a browser. If this file ever emits a
 * number of cells that isn't 641, something is wrong with the config.
 */
import { ARRAYS, CABINETS, cabinetSize, wall, type ArrayBlock, type CabinetId, type ChannelId, type DriverId, standoffOf } from '../data/wall.config';

/**
 * How a cell is built. Most are a whole box. The 12"s pair up two to a box
 * (lot 47): a lower cell without its top board, an upper one without its
 * bottom. The cluster's strips (lot 49) are open-backed channels with end
 * plates only at each length's two ends.
 */
export type Variant = 'whole' | 'lower' | 'upper' | 'first' | 'mid' | 'last' | 'single';

/** Bare birch, matte black paint, or the strips' aluminum. */
export type Finish = 'bare' | 'black' | 'metal';

/** A stable 0–1 number from a string, so the finish mix is the same everywhere and every visit. */
function unit(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return ((h >>> 0) % 100003) / 100003;
}

export interface Cell {
  /**
   * Center of the cabinet box, meters, with y measured from the stage deck
   * surface, not the ground. Anything that draws a cell must lift it by
   * wall.dimensions.stageDeckHeight.
   */
  position: [number, number, number];
  /** Yaw only — cabinets sit level; curved blocks fan about Y. */
  rotationY: number;
  size: { w: number; h: number; d: number };
  cabinet: CabinetId;
  driver: DriverId;
  channel: ChannelId;
  block: string;
  /** Direction this block flies in the exploded view. */
  explode: [number, number, number];
  /** Column and row within the block, for staggered effects. */
  col: number;
  row: number;
  variant: Variant;
  /**
   * Decided here, once, so the explorer and Blender (via scene.json) finish
   * every cabinet the same way. See PROVENANCE['materials.plywood'].
   */
  finish: Finish;
}

function variantOf(b: ArrayBlock, col: number, row: number): Variant {
  const cab = CABINETS[b.cabinet];
  if (cab.strip) {
    const k = col % cab.strip;
    const first = k === 0;
    const last = k === cab.strip - 1 || col === b.cols - 1;
    return first && last ? 'single' : first ? 'first' : last ? 'last' : 'mid';
  }
  if (cab.pairRows && !(row === b.rows - 1 && b.rows % 2)) return row % 2 === 0 ? 'lower' : 'upper';
  return 'whole';
}

function finishOf(b: ArrayBlock, col: number, row: number): Finish {
  const cab = CABINETS[b.cabinet];
  if (cab.strip) return 'metal';
  // A paired box is one cabinet, so both its cells share a finish.
  const r = cab.pairRows ? row - (row % 2) : row;
  const key = cab.finishPerBlock ? b.id : `${b.id}:${col}:${r}`;
  return unit(key) < wall.materials.blackFinishRatio ? 'black' : 'bare';
}

/**
 * One block's worth of cells.
 *
 * Flat blocks are a plain grid. Curved blocks wrap the grid onto a convex arc
 * opening toward the audience (+Z), with the center of curvature `curveRadius`
 * behind the block — the documented "curved... for cylindrical dispersion"
 * geometry of the vocal cluster.
 */
export function cellsForBlock(b: ArrayBlock): Cell[] {
  const size = cabinetSize(b.cabinet);
  const driver = CABINETS[b.cabinet].driver;
  const cells: Cell[] = [];
  const halfCol = (b.cols - 1) / 2;
  // Stacks stand just behind the front steel; the cluster stands proud of it.
  const blockZ = b.z + standoffOf(b);

  for (let col = 0; col < b.cols; col++) {
    const offset = (col - halfCol) * size.w;
    let x: number;
    let z: number;
    let rotationY: number;

    if (b.curveRadius > 0) {
      // Arc length along the face maps to angle; +θ swings toward +X.
      const theta = offset / b.curveRadius;
      x = b.x + b.curveRadius * Math.sin(theta);
      z = blockZ + b.curveRadius * (Math.cos(theta) - 1);
      rotationY = theta;
    } else {
      x = b.x + offset;
      z = blockZ;
      rotationY = 0;
    }

    // The block's z is its FRONT FACE. Push the box center back by half a depth,
    // along the face normal so curved columns recess correctly.
    const nx = Math.sin(rotationY);
    const nz = Math.cos(rotationY);
    const cx = x - nx * (size.d / 2);
    const cz = z - nz * (size.d / 2);

    for (let row = 0; row < b.rows; row++) {
      cells.push({
        position: [cx, b.baseY + (row + 0.5) * size.h, cz],
        rotationY,
        size,
        cabinet: b.cabinet,
        driver,
        channel: b.channel,
        block: b.id,
        explode: b.explode,
        col,
        row,
        variant: variantOf(b, col, row),
        finish: finishOf(b, col, row),
      });
    }
  }
  return cells;
}

export function allCells(): Cell[] {
  return ARRAYS.flatMap(cellsForBlock);
}

/** Cells grouped by cabinet type and how they're built — one InstancedMesh per group and role. */
export function cellsByCabinet(cells = allCells()): Map<string, { cabinet: CabinetId; variant: Variant; cells: Cell[] }> {
  const m = new Map<string, { cabinet: CabinetId; variant: Variant; cells: Cell[] }>();
  for (const c of cells) {
    const key = `${c.cabinet}:${c.variant}`;
    const g = m.get(key);
    if (g) g.cells.push(c);
    else m.set(key, { cabinet: c.cabinet, variant: c.variant, cells: [c] });
  }
  return m;
}

export interface Envelope {
  minX: number; maxX: number;
  minY: number; maxY: number;
  minZ: number; maxZ: number;
  width: number; height: number; depth: number;
}

/** Bounding box of every cabinet, ignoring yaw (close enough at these angles). */
export function envelope(cells = allCells()): Envelope {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const c of cells) {
    const [x, y, z] = c.position;
    minX = Math.min(minX, x - c.size.w / 2); maxX = Math.max(maxX, x + c.size.w / 2);
    minY = Math.min(minY, y - c.size.h / 2); maxY = Math.max(maxY, y + c.size.h / 2);
    minZ = Math.min(minZ, z - c.size.d / 2); maxZ = Math.max(maxZ, z + c.size.d / 2);
  }
  return { minX, maxX, minY, maxY, minZ, maxZ, width: maxX - minX, height: maxY - minY, depth: maxZ - minZ };
}

/**
 * How much of the wall's face is actually speaker, and how much is open
 * structure. 641 drivers of these sizes cannot fill a 60-foot frame — see
 * docs/reconstruction-spec.md §12. Shown to visitors rather than hidden.
 */
export function faceCoverage(cells = allCells(), openingHeight: number) {
  const baffle = cells.reduce((sum, c) => sum + c.size.w * c.size.h, 0);
  const env = envelope(cells);
  const opening = env.width * openingHeight;
  return { baffle, opening, fraction: baffle / opening };
}

/** Bounds of one array block, deck-relative like Cell, for highlighting and info panels. */
export function blockBounds(blockId: string, cells = allCells()) {
  const mine = cells.filter((c) => c.block === blockId);
  if (!mine.length) return null;
  const env = envelope(mine);
  return {
    centre: [(env.minX + env.maxX) / 2, (env.minY + env.maxY) / 2, (env.minZ + env.maxZ) / 2] as [number, number, number],
    size: [env.width, env.height, env.depth] as [number, number, number],
    count: mine.length,
    driver: mine[0].driver,
    channel: mine[0].channel,
  };
}

export function driverTally(cells = allCells()): Record<DriverId, number> & { total: number } {
  const t = { jbl15: 0, jbl12: 0, jbl5: 0, evHorn: 0, total: 0 };
  for (const c of cells) { t[c.driver]++; t.total++; }
  return t;
}
