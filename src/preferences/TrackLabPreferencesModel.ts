/**
 * TrackLabPreferencesModel.ts
 *
 * Model for the simulation-specific preferences shown in Preferences →
 * Simulation. Each preference Property takes its initial value from the
 * corresponding query parameter in trackLabQueryParameters.
 */

import { BooleanProperty } from "scenerystack/axon";
import type { Tandem } from "scenerystack/tandem";
import TrackLabNamespace from "../TrackLabNamespace.js";
import trackLabQueryParameters from "./trackLabQueryParameters.js";

export class TrackLabPreferencesModel {
  /**
   * Whether the auto-tracking checkbox is visible in the control panel.
   * When false, the auto-tracking checkbox is completely hidden.
   * When true, the checkbox is shown and can be toggled by the user.
   */
  public readonly enableAutoTrackingProperty: BooleanProperty;

  /**
   * Whether velocity quantities (vx, vy, speed) appear in the graph axis selectors.
   */
  public readonly showVelocityInGraphProperty: BooleanProperty;

  /**
   * Whether acceleration quantities (ax, ay, |a|) appear in the graph axis selectors.
   */
  public readonly showAccelerationInGraphProperty: BooleanProperty;

  /**
   * Whether the measurement tools panel (measuring tape + angle tool) is visible.
   * When false, the panel is completely hidden.
   * When true, the panel appears above the info button.
   */
  public readonly enableMeasurementToolsProperty: BooleanProperty;

  public constructor(tandem?: Tandem) {
    this.enableAutoTrackingProperty = new BooleanProperty(
      trackLabQueryParameters.enableAutoTracking,
      tandem ? { tandem: tandem.createTandem("enableAutoTrackingProperty") } : undefined,
    );
    this.showVelocityInGraphProperty = new BooleanProperty(
      trackLabQueryParameters.showVelocityInGraph,
      tandem ? { tandem: tandem.createTandem("showVelocityInGraphProperty") } : undefined,
    );
    this.showAccelerationInGraphProperty = new BooleanProperty(
      trackLabQueryParameters.showAccelerationInGraph,
      tandem ? { tandem: tandem.createTandem("showAccelerationInGraphProperty") } : undefined,
    );
    this.enableMeasurementToolsProperty = new BooleanProperty(
      trackLabQueryParameters.enableMeasurementTools,
      tandem ? { tandem: tandem.createTandem("enableMeasurementToolsProperty") } : undefined,
    );
  }

  public reset(): void {
    this.enableAutoTrackingProperty.reset();
    this.showVelocityInGraphProperty.reset();
    this.showAccelerationInGraphProperty.reset();
    this.enableMeasurementToolsProperty.reset();
  }
}

TrackLabNamespace.register("TrackLabPreferencesModel", TrackLabPreferencesModel);
