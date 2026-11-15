import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractVideoFileMetadata } from "../src/webcam.js";

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
