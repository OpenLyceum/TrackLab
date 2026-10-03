import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenCVTracker } from "../../src/tracking/OpenCVTracker.js";

describe("OpenCVTracker search fallback", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reacquires outside the local window using the same captured frame", async () => {
    const requests: Array<{ type: string; imageData: ImageData; searchX: number; searchY: number }> = [];
    let matches = 0;
    class RespondingWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror = null;
      postMessage(msg: { id: number; type: string; imageData: ImageData; searchX: number; searchY: number }) {
        requests.push(msg);
        const data =
          msg.type === "init"
            ? { id: msg.id, type: "init-done", templateW: 10, templateH: 10, centerX: 100, centerY: 100 }
            : { id: msg.id, type: "track-result", x: 500, y: 300, confidence: ++matches === 1 ? 0.1 : 0.9 };
        queueMicrotask(() => this.onmessage?.({ data } as MessageEvent));
      }
    }
    vi.stubGlobal("Worker", RespondingWorker);
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    const draw = vi.fn();
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (
      this: HTMLCanvasElement,
    ) {
      const ctx = originalGetContext.call(this, "2d") as CanvasRenderingContext2D | null;
      if (ctx) {
        ctx.drawImage = draw;
      }
      return ctx;
    });
    const tracker = new OpenCVTracker(640, 480);
    const video = document.createElement("video");
    await tracker.initFromVideo(video, { x: 95, y: 95, w: 10, h: 10 });
    await expect(tracker.track(video)).resolves.toEqual({ x: 500, y: 300 });
    const searches = requests.filter((msg) => msg.type === "track");
    expect(searches).toHaveLength(2);
    expect(searches[0]?.imageData.width).toBe(50);
    expect(searches[1]).toMatchObject({ searchX: 0, searchY: 0, imageData: { width: 640, height: 480 } });
    expect(draw).toHaveBeenCalledTimes(2);
    getContext.mockRestore();
  });
});
