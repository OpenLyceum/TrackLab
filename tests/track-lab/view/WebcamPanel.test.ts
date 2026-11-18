import { NumberProperty } from "scenerystack/axon";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WebcamPanel } from "../../../src/track-lab/view/WebcamPanel.js";

describe("WebcamPanel open", () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, "mediaDevices");
  });

  it("does not start the camera when Cancel lands while permission is pending", async () => {
    const permission = Promise.withResolvers<MediaStream>();
    const permissionTrack = { stop: vi.fn() };
    const getUserMedia = vi.fn(() => permission.promise);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia, enumerateDevices: vi.fn(() => Promise.resolve([])) },
    });
    const onCancel = vi.fn();
    const panel = new WebcamPanel({
      frameRateProperty: new NumberProperty(30),
      onVideoReady: vi.fn(),
      onCancel,
    });

    const opened = panel.open();
    panel.cleanup();
    permission.resolve({ getTracks: () => [permissionTrack] } as unknown as MediaStream);
    await opened;

    // Only the permission probe ran, and its temporary stream was released.
    expect(getUserMedia).toHaveBeenCalledOnce();
    expect(permissionTrack.stop).toHaveBeenCalledOnce();
    panel.dispose();
  });
});
