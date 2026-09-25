/**
 * Turns the array blocks in wall.config into one transform per driver.
 *
 * Pure functions, no three.js: the renderer feeds these into InstancedMesh, and
 * scripts/verify.mjs checks them without a browser. If this file ever emits a
 * number of cells that isn't 641, something is wrong with the config.
 */
import { ARRAYS, CABINETS, cabinetSize, wall, type ArrayBlock, type CabinetId, type ChannelId, type DriverId } from '../data/wall.config';

export interface Cell {
  /**
   * Centre of the cabinet box, metres, with y measured from the stage deck
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
}

/**
 * One block's worth of cells.
 *
 * Flat blocks are a plain grid. Curved blocks wrap the grid onto a convex arc
 * opening toward the audience (+Z), with the centre of curvature `curveRadius`
 * behind the block — the documented "curved... for cylindrical dispersion"
 * geometry of the vocal cluster.
 */
export function cellsForBlock(b: ArrayBlock): Cell[] {
  const size = cabinetSize(b.cabinet);
  const driver = CABINETS[b.cabinet].driver;
  const cells: Cell[] = [];
  const halfCol = (b.cols - 1) / 2;
  // Stacks stand proud of the steel, not inside it. See dimensions.arrayStandoff.
  const blockZ = b.z + wall.dimensions.arrayStandoff;

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

    // The block's z is its FRONT FACE. Push the box centre back by half a depth,
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
      });
    }
  }
  return cells;
}

export function allCells(): Cell[] {
  return ARRAYS.flatMap(cellsForBlock);
}

/** Cells grouped by cabinet type — one InstancedMesh per group. */
export function cellsByCabinet(cells = allCells()): Map<CabinetId, Cell[]> {
  const m = new Map<CabinetId, Cell[]>();
  for (const c of cells) {
    const list = m.get(c.cabinet);
    if (list) list.push(c);
    else m.set(c.cabinet, [c]);
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
