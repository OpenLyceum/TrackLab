/**
 * GraphTypes.ts
 *
 * Shared graph geometry/config types (broken out to avoid cycles with gesture handlers).
 */

import type { ChartRectangle, ChartTransform } from "scenerystack/bamboo";
import type { GraphDataManager } from "./GraphDataManager.js";

export interface ChartConfig {
  chartTransform: ChartTransform;
  chartRectangle: ChartRectangle;
  dataManager: GraphDataManager;
}

export interface GraphDimensions {
  width: number;
  height: number;
}
