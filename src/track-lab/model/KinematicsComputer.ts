/**
 * KinematicsComputer.ts
 *
 * Pure functions for computing velocity and acceleration from digitized track
 * points via finite differences.  All inputs and outputs are plain data types
 * from Track.ts — no Axon Properties, no SceneryStack dependencies.
 */

import type { KinematicPoint, Track, TrackKinematics } from "./Track.js";

/**
 * Scalar finite difference at index i within an array of n values.
 *
 * Uses a local quadratic on three samples, evaluated at the current timestamp.
 * Endpoints use one-sided quadratic fits; two samples use a secant slope.  Returns null if the array
 * has fewer than 2 elements, if the time interval is non-positive, or if
 * either endpoint value is null.
 *
 * @param getValue  Returns the scalar quantity at index j (null = unknown).
 * @param getTime   Returns the time stamp at index j.
 * @param i         Index to differentiate at.
 * @param n         Total number of elements.
 */
function finiteDifference(
  getValue: (j: number) => number | null,
  getTime: (j: number) => number,
  i: number,
  n: number,
): number | null {
  if (n < 2) {
    return null;
  }
  if (n === 2) {
    const first = getValue(0);
    const last = getValue(1);
    const dt = getTime(1) - getTime(0);
    return first !== null && last !== null && dt > 0 ? (last - first) / dt : null;
  }

  // Differentiate the local quadratic at this sample, including one-sided
  // three-point stencils at the ends. Relative times avoid cancellation for
  // large absolute timestamps and handle skipped/deleted video frames.
  const firstIndex = i === 0 ? 0 : i === n - 1 ? n - 3 : i - 1;
  const first = getValue(firstIndex);
  const middle = getValue(firstIndex + 1);
  const last = getValue(firstIndex + 2);
  const firstTime = getTime(firstIndex);
  const h0 = getTime(firstIndex + 1) - firstTime;
  const h1 = getTime(firstIndex + 2) - getTime(firstIndex + 1);
  if (first === null || middle === null || last === null || !(h0 > 0 && h1 > 0)) {
    return null;
  }
  const firstSlope = (middle - first) / h0;
  const lastSlope = (last - middle) / h1;
  const curvature = (lastSlope - firstSlope) / (h0 + h1);
  return firstSlope + curvature * (2 * (getTime(i) - firstTime) - h0);
}

/**
 * Computes velocity and acceleration for each point in a track.
 * Uses local quadratic derivatives with nonuniform sample spacing.
 *
 * Velocity at point i:
 *   - If only one point: null
 *   - Two points: secant slope
 *   - Otherwise: derivative of the local three-point quadratic at time[i]
 *
 * Acceleration at point i:
 *   - Computed from velocities using the same differencing approach
 */
export function computeTrackKinematics(track: Track): TrackKinematics {
  const { points } = track;
  const n = points.length;

  if (n === 0) {
    return { ...track, points: [] };
  }

  const getTime = (j: number) => points[j]?.time ?? 0;
  const getX = (j: number) => points[j]?.x ?? null;
  const getY = (j: number) => points[j]?.y ?? null;

  // First pass: velocities via finite difference of position
  const vxArr = points.map((_, i) => finiteDifference(getX, getTime, i, n));
  const vyArr = points.map((_, i) => finiteDifference(getY, getTime, i, n));

  // Second pass: accelerations via finite difference of velocity
  const axArr = points.map((_, i) => finiteDifference((j) => vxArr[j] ?? null, getTime, i, n));
  const ayArr = points.map((_, i) => finiteDifference((j) => vyArr[j] ?? null, getTime, i, n));

  const kinematicPoints: KinematicPoint[] = points.map((pt, i) => {
    const vx = vxArr[i] ?? null;
    const vy = vyArr[i] ?? null;
    const ax = axArr[i] ?? null;
    const ay = ayArr[i] ?? null;
    return {
      frame: pt.frame,
      time: pt.time,
      x: pt.x,
      y: pt.y,
      vx,
      vy,
      speed: vx !== null && vy !== null ? Math.sqrt(vx * vx + vy * vy) : null,
      ax,
      ay,
      accelerationMagnitude: ax !== null && ay !== null ? Math.sqrt(ax * ax + ay * ay) : null,
    };
  });

  return {
    id: track.id,
    symbol: track.symbol,
    colorIndex: track.colorIndex,
    points: kinematicPoints,
  };
}
