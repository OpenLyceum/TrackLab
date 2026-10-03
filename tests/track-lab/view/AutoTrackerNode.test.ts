import { BooleanProperty, Property } from "scenerystack/axon";
import { Dimension2, Matrix3, Transform3 } from "scenerystack/dot";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TrackingModel } from "../../../src/track-lab/model/TrackingModel.js";
import { AutoTrackerNode } from "../../../src/track-lab/view/AutoTrackerNode.js";

describe("AutoTrackerNode frame identity", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("records the captured time and track when playback and selection change during matching", async () => {
    const tracking = new TrackingModel();
    const shown = new BooleanProperty(true);
    const dimensions = new Property(new Dimension2(640, 480));
    const transform = new Property(new Transform3(Matrix3.IDENTITY));
    const video = document.createElement("video");
    tracking.addTrackAndActivate();
    tracking.addTrack();
    vi.spyOn(tracking, "isTrackerReady", "get").mockReturnValue(true);
    const result = Promise.withResolvers<{ x: number; y: number } | null>();
    vi.spyOn(tracking, "trackFrame").mockReturnValue(result.promise);
    let callback: FrameRequestCallback | undefined;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      callback = cb;
      return 1;
    });
    const node = new AutoTrackerNode(video, shown, {
      tracking,
      videoDimensionsProperty: dimensions,
      timeToFrame: (time) => Math.round(time * 30),
      modelViewTransformProperty: transform,
    });
    try {
      video.currentTime = 1;
      video.dispatchEvent(new Event("timeupdate"));
      expect(callback).toBeDefined();
      callback?.(0);
      video.currentTime = 2;
      tracking.activeTrackIdProperty.value = "track-B";
      result.resolve({ x: 10, y: 20 });
      await result.promise;
      // Allow trackFrame and processFrame's await continuations to finish.
      await Promise.resolve();
      await Promise.resolve();
      expect(tracking.tracksProperty.value[0]?.points).toEqual([{ frame: 30, time: 1, x: 10, y: 20 }]);
      expect(tracking.tracksProperty.value[1]?.points).toEqual([]);
    } finally {
      node.dispose();
      shown.dispose();
      dimensions.dispose();
      transform.dispose();
    }
  });
});
