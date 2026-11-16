import { describe, expect, it } from "vitest";
import { computeTrackKinematics } from "../../../src/track-lab/model/KinematicsComputer.js";
import type { Track } from "../../../src/track-lab/model/Track.js";

describe("KinematicsComputer", () => {
  it("computes constant vx for uniform motion along x", () => {
    const vx = 3;
    const track: Track = {
      id: "uniform",
      symbol: "A",
      colorIndex: 0,
      points: [
        { frame: 0, time: 0, x: 0, y: 0 },
        { frame: 1, time: 1, x: vx, y: 0 },
        { frame: 2, time: 2, x: 2 * vx, y: 0 },
        { frame: 3, time: 3, x: 3 * vx, y: 0 },
      ],
    };

    const kinematics = computeTrackKinematics(track);

    for (const point of kinematics.points) {
      expect(point.vx).toBeCloseTo(vx, 6);
      expect(point.vy).toBeCloseTo(0, 6);
    }
  });

  it("returns null velocities for a single-point track", () => {
    const track: Track = {
      id: "lonely",
      symbol: "B",
      colorIndex: 1,
      points: [{ frame: 0, time: 0, x: 1, y: 2 }],
    };

    const kinematics = computeTrackKinematics(track);

    expect(kinematics.points).toHaveLength(1);
    expect(kinematics.points[0]?.vx).toBeNull();
    expect(kinematics.points[0]?.vy).toBeNull();
    expect(kinematics.points[0]?.ax).toBeNull();
    expect(kinematics.points[0]?.ay).toBeNull();
  });
});

describe("nonuniform sample times", () => {
  it.each([
    [0, 1, 3, 4, 5],
    [0, 0.1, 0.7],
    [2, 3, 4, 5],
  ])("recovers quadratic motion including endpoints from %j", (...times) => {
    const track: Track = {
      id: "accelerated",
      symbol: "A",
      colorIndex: 0,
      points: times.map((time, frame) => ({ frame, time, x: time * time, y: -3 * time * time + 2 * time })),
    };
    for (const point of computeTrackKinematics(track).points) {
      expect(point.vx).toBeCloseTo(2 * point.time, 10);
      expect(point.vy).toBeCloseTo(-6 * point.time + 2, 10);
      expect(point.ax).toBeCloseTo(2, 10);
      expect(point.ay).toBeCloseTo(-6, 10);
    }
  });

  it("uses the secant for two points and rejects repeated timestamps", () => {
    const track: Track = {
      id: "two",
      symbol: "A",
      colorIndex: 0,
      points: [
        { frame: 0, time: 1, x: 2, y: 0 },
        { frame: 1, time: 3, x: 8, y: 0 },
      ],
    };
    expect(computeTrackKinematics(track).points.map((point) => point.vx)).toEqual([3, 3]);
    track.points[1]!.time = 1;
    expect(computeTrackKinematics(track).points.map((point) => point.vx)).toEqual([null, null]);
  });
});
