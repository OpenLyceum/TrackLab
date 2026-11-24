/**
 * PlottableProperty.ts
 *
 * Describes a kinematics quantity that can appear on a graph axis.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import type { KinematicPoint } from "../model/Track.js";

export type PlottableProperty = {
  /** Field read from each track point. */
  key: keyof KinematicPoint;
  /** Label shown in the axis selector and as the axis title. */
  name: string | TReadOnlyProperty<string>;
  /** Unit suffix for the axis label (e.g. "m", "m/s"). */
  unit?: string | TReadOnlyProperty<string>;
};
