import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractVideoFileMetadata, WebcamRecorder } from "../src/webcam.js";

function createDecoder() {
  const frames = [
    { duration: 40_000, close: vi.fn() },
    { duration: 60_000, close: vi.fn() },
  ];
  const decoder = {
    tracks: {
      ready: Promise.resolve(),
      selectedTrack: { frameCount: frames.length } as { frameCount: number } | null,
    },
    decode: vi.fn(({ frameIndex }: { frameIndex: number }) => {
      const image = frames[frameIndex];
      if (!image) {
        throw new Error("Unexpected frame index");
      }
      return Promise.resolve({ image });
    }),
    close: vi.fn(),
  };
  return { decoder, frames };
}

function webpFile(): File {
  return new File(["animated WebP fixture"], "motion.webp", { type: "image/webp" });
}

describe("animated WebP metadata", () => {
  let fixture: ReturnType<typeof createDecoder>;
  let constructDecoder: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fixture = createDecoder();
    constructDecoder = vi.fn(function MockImageDecoder() {
      return fixture.decoder;
    });
    vi.stubGlobal("ImageDecoder", constructDecoder);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sums frame durations and closes every frame before closing the decoder", async () => {
    expect(await extractVideoFileMetadata(webpFile(), 25)).toEqual({ duration: 0.1, fps: 20, frameCount: 2 });
    expect(constructDecoder).toHaveBeenCalledExactlyOnceWith({
      data: expect.any(ReadableStream),
      type: "image/webp",
      preferAnimation: true,
    });
    expect(fixture.decoder.decode).toHaveBeenNthCalledWith(1, { frameIndex: 0 });
    expect(fixture.decoder.decode).toHaveBeenNthCalledWith(2, { frameIndex: 1 });
    for (const frame of fixture.frames) {
      expect(frame.close).toHaveBeenCalledOnce();
      expect(frame.close).toHaveBeenCalledBefore(fixture.decoder.close);
    }
    expect(fixture.decoder.close).toHaveBeenCalledOnce();
  });

  it.each([null, { frameCount: 0 }])("closes the decoder when there is no usable track: %s", async (track) => {
    fixture.decoder.tracks.selectedTrack = track;
    expect(await extractVideoFileMetadata(webpFile(), 25)).toEqual({ duration: 0, fps: 25 });
    expect(fixture.decoder.decode).not.toHaveBeenCalled();
    expect(fixture.decoder.close).toHaveBeenCalledOnce();
  });

  it("closes the decoder if track initialization rejects", async () => {
    fixture.decoder.tracks.ready = Promise.reject(new Error("Invalid WebP"));
    expect(await extractVideoFileMetadata(webpFile(), 25)).toEqual({ duration: 0, fps: 25 });
    expect(fixture.decoder.decode).not.toHaveBeenCalled();
    expect(fixture.decoder.close).toHaveBeenCalledOnce();
  });

  it("closes the decoder if the first frame fails to decode", async () => {
    fixture.decoder.decode.mockRejectedValueOnce(new Error("Frame decode failed"));
    expect(await extractVideoFileMetadata(webpFile(), 25)).toEqual({ duration: 0, fps: 25 });
    expect(fixture.decoder.close).toHaveBeenCalledOnce();
    expect(fixture.frames[0]!.close).not.toHaveBeenCalled();
  });

  it("closes completed frames and the decoder if a later frame fails", async () => {
    fixture.decoder.decode.mockResolvedValueOnce({ image: fixture.frames[0]! });
    fixture.decoder.decode.mockRejectedValueOnce(new Error("Second frame decode failed"));
    expect(await extractVideoFileMetadata(webpFile(), 25)).toEqual({ duration: 0, fps: 25 });
    expect(fixture.frames[0]!.close).toHaveBeenCalledOnce();
    expect(fixture.frames[1]!.close).not.toHaveBeenCalled();
    expect(fixture.decoder.close).toHaveBeenCalledOnce();
  });

  it("uses the caller's fallback if ImageDecoder is unavailable", async () => {
    vi.stubGlobal("ImageDecoder", undefined);
    expect(await extractVideoFileMetadata(webpFile(), 25)).toEqual({ duration: 0, fps: 25 });
    expect(constructDecoder).not.toHaveBeenCalled();
  });

  it("falls back without closing a decoder whose constructor failed", async () => {
    constructDecoder.mockImplementationOnce(function MockImageDecoder() {
      throw new Error("Unsupported codec");
    });
    expect(await extractVideoFileMetadata(webpFile(), 25)).toEqual({ duration: 0, fps: 25 });
    expect(constructDecoder).toHaveBeenCalledOnce();
    expect(fixture.decoder.close).not.toHaveBeenCalled();
  });
});

function createStream() {
  const track = { stop: vi.fn() };
  const stream = {
    track,
    getTracks: () => [track],
    getVideoTracks: () => [track],
    active: true,
  };
  return stream;
}

type FakeStream = ReturnType<typeof createStream>;

describe("WebcamRecorder preview requests", () => {
  let pendingOpens: PromiseWithResolvers<FakeStream>[];
  let previewEl: HTMLVideoElement;
  let play: ReturnType<typeof vi.fn>;
  let recorder: WebcamRecorder;

  // Settle the next pending getUserMedia() and let startPreview() run to its next await.
  const openCamera = async (index: number): Promise<FakeStream> => {
    const stream = createStream();
    pendingOpens[index]!.resolve(stream);
    await Promise.resolve();
    await Promise.resolve();
    return stream;
  };

  beforeEach(() => {
    pendingOpens = [];
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn(() => {
          const pending = Promise.withResolvers<FakeStream>();
          pendingOpens.push(pending);
          return pending.promise;
        }),
      },
    });
    play = vi.fn(() => Promise.resolve());
    previewEl = { srcObject: null, play } as unknown as HTMLVideoElement;
    recorder = new WebcamRecorder();
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, "mediaDevices");
  });

  it("stops a stream that arrives after cleanup", async () => {
    const started = recorder.startPreview(previewEl);
    recorder.cleanup();
    const stream = await openCamera(0);
    await started;
    expect(stream.track.stop).toHaveBeenCalledOnce();
    expect(previewEl.srcObject).toBeNull();
    expect(recorder.getStream()).toBeNull();
    expect(play).not.toHaveBeenCalled();
  });

  it("keeps the newer stream when an older open resolves last", async () => {
    const first = recorder.startPreview(previewEl, "camera-a");
    const second = recorder.startPreview(previewEl, "camera-b");
    const newer = await openCamera(1);
    await second;
    const older = await openCamera(0);
    await first;
    expect(older.track.stop).toHaveBeenCalledOnce();
    expect(newer.track.stop).not.toHaveBeenCalled();
    expect(recorder.getStream()).toBe(newer);
    expect(previewEl.srcObject).toBe(newer);
    expect(recorder.getCurrentDeviceId()).toBe("camera-b");
  });

  it("releases the stream and rethrows when playback fails", async () => {
    const error = new Error("NotAllowedError");
    play.mockRejectedValueOnce(error);
    const started = recorder.startPreview(previewEl);
    const stream = await openCamera(0);
    await expect(started).rejects.toBe(error);
    expect(stream.track.stop).toHaveBeenCalledOnce();
    expect(previewEl.srcObject).toBeNull();
    expect(recorder.getStream()).toBeNull();
  });

  it("stays quiet when playback of a superseded request is aborted", async () => {
    const pendingPlay = Promise.withResolvers<void>();
    play.mockReturnValueOnce(pendingPlay.promise);
    const started = recorder.startPreview(previewEl);
    const stream = await openCamera(0);
    recorder.cleanup();
    pendingPlay.reject(new Error("AbortError"));
    await expect(started).resolves.toBeUndefined();
    expect(stream.track.stop).toHaveBeenCalled();
    expect(recorder.getStream()).toBeNull();
  });
});
