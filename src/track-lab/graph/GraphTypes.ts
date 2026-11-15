/**
 * GraphTypes.ts
 *
 * Shared graph geometry/config types (broken out to avoid cycles with gesture handlers).
 */

export interface ChartConfig {
  chartTransform: ChartTransform;
  chartRectangle: ChartRectangle;
  dataManager: GraphDataManager;
}

export interface GraphDimensions {
  width: number;
  height: number;
}
