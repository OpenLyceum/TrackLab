/**
 * kinematics-plottable-properties.ts
 *
 * Canonical registry of every quantity that can appear on a kinematics graph
 * axis.  Centralising the list here means:
 *
 *  - Adding a new physical quantity (e.g. kinetic energy) requires a change in
 *    exactly one place rather than hunting through KinematicsGraphNode.
 *  - The selected fields are checked against KinematicPoint.
 *  - Unit properties from the model are wired in a single factory call,
 *    keeping KinematicsGraphNode free of quantity-specific knowledge.
 *
 * ## Adding a quantity
 *
 *   1. Compute it in `KinematicsComputer.ts` and add it to `TrackKinematicsPoint`.
 *   2. Add a `createPlottableProperty(...)` call below with the matching key.
 *
 * That's it — the graph axis selector picks it up automatically because it
 * renders whatever is in this array.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import type { OverlayToolsModel } from "../model/OverlayToolsModel.js";
import type { PlottableProperty } from "./PlottableProperty.js";

function createPlottableProperty(
  name: string,
  unit: string | TReadOnlyProperty<string>,
  key: PlottableProperty["key"],
): PlottableProperty {
  return { name, unit, key };
}

/**
 * Categorised groups of kinematics quantities available for axis selection.
 * Each category can be independently included or excluded based on user preferences.
 */
export type KinematicsPlottableGroups = {
  /** Time — always available */
  time: PlottableProperty[];
  /** Position components — always available */
  position: readonly [PlottableProperty, PlottableProperty];
  /** Velocity components — shown when the "show velocity" preference is on */
  velocity: PlottableProperty[];
  /** Acceleration components — shown when the "show acceleration" preference is on */
  acceleration: PlottableProperty[];
};

/**
 * Build the categorised groups of kinematics quantities available for axis selection.
 * Called once per `KinematicsGraphNode` instance.
 *
 * @param model - Provides the reactive unit-string properties so that axis
 *   labels update automatically when the user changes the calibration unit.
 */
export function buildKinematicsPlottableGroups(overlayTools: OverlayToolsModel): KinematicsPlottableGroups {
  return {
    // ── Time ──────────────────────────────────────────────────────────────
    time: [createPlottableProperty("t", "s", "time")],

    // ── Position ──────────────────────────────────────────────────────────
    position: [
      createPlottableProperty("x", overlayTools.calibUnitProperty, "x"),
      createPlottableProperty("y", overlayTools.calibUnitProperty, "y"),
    ],

    // ── Velocity ──────────────────────────────────────────────────────────
    velocity: [
      createPlottableProperty("vx", overlayTools.velocityUnitProperty, "vx"),
      createPlottableProperty("vy", overlayTools.velocityUnitProperty, "vy"),
      createPlottableProperty("speed", overlayTools.velocityUnitProperty, "speed"),
    ],

    // ── Acceleration ──────────────────────────────────────────────────────
    acceleration: [
      createPlottableProperty("ax", overlayTools.accelerationUnitProperty, "ax"),
      createPlottableProperty("ay", overlayTools.accelerationUnitProperty, "ay"),
      createPlottableProperty("|a|", overlayTools.accelerationUnitProperty, "accelerationMagnitude"),
    ],
  };
}
