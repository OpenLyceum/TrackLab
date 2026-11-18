/**
 * Fleet-standard memory-leak regression suite (SceneryStackTemplate / QubitSketch pattern).
 *
 * Creates a disposable model object inside a function boundary, disposes it, forces
 * garbage collection via global.gc (--expose-gc in vitest.config.ts), then asserts via
 * WeakRef that the object was collected. V8 requires a function boundary (not merely
 * a block scope) so local strong references die when the helper returns.
 */

import { BooleanProperty, NumberProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { KeyboardDragDirectionToKeyStringPropertiesMap, Node } from "scenerystack/scenery";
import { describe, expect, it, vi } from "vitest";
import { StringManager } from "../src/i18n/StringManager.js";
import TrackLabColors from "../src/TrackLabColors.js";
import { GraphControlsPanel } from "../src/track-lab/graph/GraphControlsPanel.js";
import type { PlottableProperty } from "../src/track-lab/graph/PlottableProperty.js";
import { OverlayToolsModel } from "../src/track-lab/model/OverlayToolsModel.js";
import { TrackingModel } from "../src/track-lab/model/TrackingModel.js";
import { TrackLabModel } from "../src/track-lab/model/TrackLabModel.js";
import { VideoPlaybackModel } from "../src/track-lab/model/VideoPlaybackModel.js";
import { AngleToolNode } from "../src/track-lab/view/AngleToolNode.js";
import { AutoTrackerNode } from "../src/track-lab/view/AutoTrackerNode.js";
import { CoordinateSystemNode } from "../src/track-lab/view/CoordinateSystemNode.js";
import { DataTableNode } from "../src/track-lab/view/DataTableNode.js";
import { DigitizingOverlayNode } from "../src/track-lab/view/DigitizingOverlayNode.js";
import { MeasuringTapeNode } from "../src/track-lab/view/MeasuringTapeNode.js";
import { PlaybackControlsNode } from "../src/track-lab/view/PlaybackControlsNode.js";
import { TrackListPanel } from "../src/track-lab/view/TrackListPanel.js";
import { VideoPlayerNode } from "../src/track-lab/view/VideoPlayerNode.js";
import { VideoSourceControlNode } from "../src/track-lab/view/VideoSourceControlNode.js";
import { WebcamPanel } from "../src/track-lab/view/WebcamPanel.js";
import { describeDisposalLeaks, expectNoListenerGrowth, forceGC } from "./helpers/memoryLeak.js";

// Named separately from the array so callers can reference them without an
// index lookup, which under noUncheckedIndexedAccess would widen to
// `PlottableProperty | undefined` and force a non-null assertion.
// Bracket access because `point` is a Record<string, number> and the project
// sets noPropertyAccessFromIndexSignature.
const TIME_PLOTTABLE: PlottableProperty = {
  name: "t",
  accessor: (point: Record<string, number>) => point["t"] ?? 0,
};
const POSITION_PLOTTABLE: PlottableProperty = {
  name: "x",
  accessor: (point: Record<string, number>) => point["x"] ?? 0,
};

const SAMPLE_PLOTTABLES: PlottableProperty[] = [TIME_PLOTTABLE, POSITION_PLOTTABLE];

/**
 * Number of listeners currently attached to `property`.
 *
 * Axon's TinyEmitter exposes getListenerCount() publicly but ReadOnlyProperty
 * re-declares it private, so the cast is deliberate. The public alternative,
 * hasListeners(), is too coarse: these properties always carry listeners from
 * the model's own DerivedProperties, so only the exact count distinguishes a
 * clean dispose from a retained one.
 */
function listenerCount(property: TReadOnlyProperty<unknown>): number {
  return (property as unknown as { getListenerCount(): number }).getListenerCount();
}

/** Shared no-op callback for view constructors under test. */
const noop = (): void => {
  /* no-op */
};

function createAndDisposeGraphControlsPanel(): WeakRef<object> {
  // Explicit type argument: TypeScript narrows these consts to RecordPlottable
  // from their initializers, and Property<T> is invariant in T.
  const xPropertyProperty = new Property<PlottableProperty>(TIME_PLOTTABLE);
  const yPropertyProperty = new Property<PlottableProperty>(POSITION_PLOTTABLE);
  const panel = new GraphControlsPanel(SAMPLE_PLOTTABLES, xPropertyProperty, yPropertyProperty, 200);
  const ref = new WeakRef<object>(panel);
  panel.dispose();
  xPropertyProperty.dispose();
  yPropertyProperty.dispose();
  return ref;
}

describe("Memory leak regression", () => {
  it("GraphControlsPanel is collected after dispose", async () => {
    const ref = createAndDisposeGraphControlsPanel();
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });

  it("double dispose() does not throw", () => {
    const xPropertyProperty = new Property<PlottableProperty>(TIME_PLOTTABLE);
    const yPropertyProperty = new Property<PlottableProperty>(POSITION_PLOTTABLE);
    const panel = new GraphControlsPanel(SAMPLE_PLOTTABLES, xPropertyProperty, yPropertyProperty, 200);
    panel.dispose();
    expect(() => panel.dispose()).not.toThrow();
    xPropertyProperty.dispose();
    yPropertyProperty.dispose();
  });

  // PlaybackControlsNode builds an HSlider bound to currentTimeProperty and
  // rebuilds it whenever duration, frame rate, or frame count changes. A
  // replacement that is never inserted into the scene graph must still be
  // disposed: an orphaned HSlider keeps its listeners on the model property
  // alive for the lifetime of the model, which no WeakRef on the node catches.
  it("PlaybackControlsNode leaves no listeners on currentTimeProperty after dispose", () => {
    const playback = new VideoPlaybackModel();
    const tracking = new TrackingModel();
    const videoElement = document.createElement("video");

    const baseline = listenerCount(playback.currentTimeProperty);
    // The step buttons' enabled state derives from isPlayingProperty.
    const isPlayingBaseline = listenerCount(playback.isPlayingProperty);

    for (let i = 0; i < 3; i++) {
      const node = new PlaybackControlsNode(playback, tracking, videoElement, noop, noop, noop);
      node.dispose();
    }

    expect(listenerCount(playback.currentTimeProperty)).toBe(baseline);
    expect(listenerCount(playback.isPlayingProperty)).toBe(isPlayingBaseline);
  });

  it("PlaybackControlsNode scrubber rebuilds do not accumulate listeners", () => {
    const playback = new VideoPlaybackModel();
    const tracking = new TrackingModel();
    const videoElement = document.createElement("video");

    const baseline = listenerCount(playback.currentTimeProperty);
    const node = new PlaybackControlsNode(playback, tracking, videoElement, noop, noop, noop);

    const afterConstruct = listenerCount(playback.currentTimeProperty);
    // Each of these triggers replaceScrubber().
    playback.durationProperty.value = 10;
    playback.durationProperty.value = 20;
    playback.frameRateProperty.value = 60;
    expect(listenerCount(playback.currentTimeProperty)).toBe(afterConstruct);

    node.dispose();
    expect(listenerCount(playback.currentTimeProperty)).toBe(baseline);
  });

  it("repeated create/dispose cycles leave no survivors", async () => {
    const refs: WeakRef<object>[] = [];
    for (let i = 0; i < 10; i++) {
      refs.push(createAndDisposeGraphControlsPanel());
    }
    await forceGC(refs);
    const survivors = refs.filter((r) => r.deref() !== undefined).length;
    expect(survivors).toBe(0);
  });
});

// Long-lived state shared across cases, like screen-model state outliving a view node.
const overlayTools = new OverlayToolsModel();
const sharedXProperty = new Property<PlottableProperty>(TIME_PLOTTABLE);
const sharedYProperty = new Property<PlottableProperty>(POSITION_PLOTTABLE);
const sharedPlayback = new VideoPlaybackModel();
const sharedTracking = new TrackingModel();
const sharedVideoElement = document.createElement("video");
const videoLoadedProperty = new BooleanProperty(true);

// The video-panel components are built as VideoPlayerNode and TrackLabScreenView build them,
// against a TrackLabModel, a video element and string Properties that all outlive them.
const trackLabModel = new TrackLabModel();
const componentVideoElement = document.createElement("video");
const autoTrackingShownProperty = new BooleanProperty(true);
const webcamFrameRateProperty = new NumberProperty(30);
const stringManager = StringManager.getInstance();
const autoTrackerStrings = stringManager.getAutoTracker();
const dataTableStrings = stringManager.getDataTable();
const webcamStrings = stringManager.getWebcam();
const trackLabA11y = stringManager.getA11yStrings();

/** Sim-lifetime string, accessible-name and model Properties each component links to. */
const autoTrackerLinkedProperties: readonly object[] = [
  autoTrackerStrings.videoTrackingAreaStringProperty,
  autoTrackerStrings.dragToSelectStringProperty,
  autoTrackingShownProperty,
  trackLabModel.playback.videoDimensionsProperty,
];
const digitizingOverlayLinkedProperties: readonly object[] = [
  trackLabA11y.digitizingAreaStringProperty,
  trackLabModel.playback.videoDimensionsProperty,
  trackLabModel.playback.currentTimeProperty,
  trackLabModel.playback.frameRateProperty,
  trackLabModel.tracking.tracksProperty,
  trackLabModel.tracking.activeTrackIdProperty,
  trackLabModel.overlayTools.modelViewTransformProperty,
  trackLabModel.overlayTools.magnifyVideoProperty,
  // Linked by hand to repaint the magnifier canvas, so counted even without a Display.
  TrackLabColors.digitizingMagnifierBorderProperty,
  TrackLabColors.digitizingMagnifierCrosshairProperty,
  TrackLabColors.digitizingMagnifierShadowProperty,
];
const dataTableLinkedProperties: readonly object[] = [
  dataTableStrings.titleStringProperty,
  dataTableStrings.csvStringProperty,
  dataTableStrings.frameStringProperty,
  dataTableStrings.noDataStringProperty,
  trackLabA11y.exportCSVStringProperty,
  trackLabA11y.dataTableStringProperty,
  trackLabA11y.tableResizeTopLeftStringProperty,
  trackLabA11y.tableResizeTopRightStringProperty,
  trackLabA11y.tableResizeBottomLeftStringProperty,
  trackLabA11y.tableResizeBottomRightStringProperty,
  trackLabModel.tracking.tracksProperty,
  trackLabModel.playback.currentFrameProperty,
  trackLabModel.playback.videoLoadedProperty,
  trackLabModel.overlayTools.calibUnitProperty,
  TrackLabColors.tableHeaderBackgroundProperty,
];
const webcamPanelLinkedProperties: readonly object[] = [
  webcamStrings.cancelStringProperty,
  webcamStrings.startRecordingStringProperty,
  webcamStrings.stopRecordingStringProperty,
  webcamStrings.reRecordStringProperty,
  webcamStrings.useVideoStringProperty,
  webcamStrings.cameraStringProperty,
  webcamStrings.recordFromWebcamStringProperty,
  stringManager.getUI().fpsStringProperty,
  webcamFrameRateProperty,
  // Linked by hand to style the preview and review <video> elements.
  TrackLabColors.videoBackgroundColorProperty,
];

const createAutoTrackerNode = () =>
  new AutoTrackerNode(componentVideoElement, autoTrackingShownProperty, {
    tracking: trackLabModel.tracking,
    videoDimensionsProperty: trackLabModel.playback.videoDimensionsProperty,
    timeToFrame: (time: number) => trackLabModel.playback.timeToFrame(time),
    modelViewTransformProperty: trackLabModel.overlayTools.modelViewTransformProperty,
  });
const createDigitizingOverlayNode = () =>
  new DigitizingOverlayNode(
    componentVideoElement,
    {
      tracking: trackLabModel.tracking,
      playback: trackLabModel.playback,
      magnifyVideoProperty: trackLabModel.overlayTools.magnifyVideoProperty,
      modelViewTransformProperty: trackLabModel.overlayTools.modelViewTransformProperty,
      recordPoint: noop,
      erasePoint: noop,
    },
    noop,
  );
const createDataTableNode = () =>
  new DataTableNode(
    trackLabModel.tracking,
    trackLabModel.playback,
    trackLabModel.playback.videoLoadedProperty,
    trackLabModel.overlayTools.calibUnitProperty,
  );
const createWebcamPanel = () =>
  new WebcamPanel({ frameRateProperty: webcamFrameRateProperty, onVideoReady: noop, onCancel: noop });

describeDisposalLeaks([
  {
    name: "AutoTrackerNode",
    create: createAutoTrackerNode,
    keepAlive: () => [trackLabModel, componentVideoElement, ...autoTrackerLinkedProperties],
  },
  {
    name: "DigitizingOverlayNode",
    create: createDigitizingOverlayNode,
    keepAlive: () => [trackLabModel, componentVideoElement, ...digitizingOverlayLinkedProperties],
  },
  {
    name: "DataTableNode",
    create: createDataTableNode,
    keepAlive: () => [trackLabModel, ...dataTableLinkedProperties],
  },
  {
    name: "WebcamPanel",
    create: createWebcamPanel,
    keepAlive: () => webcamPanelLinkedProperties,
  },
  {
    name: "MeasuringTapeNode",
    create: () => new MeasuringTapeNode(overlayTools.measuringTapeVisibleProperty, overlayTools),
  },
  {
    name: "AngleToolNode",
    create: () => new AngleToolNode(overlayTools.angleToolVisibleProperty, overlayTools),
  },
  {
    name: "GraphControlsPanel",
    create: () => new GraphControlsPanel(SAMPLE_PLOTTABLES, sharedXProperty, sharedYProperty, 200),
  },
  {
    name: "PlaybackControlsNode",
    create: () => new PlaybackControlsNode(sharedPlayback, sharedTracking, sharedVideoElement, noop, noop, noop),
  },
  {
    name: "CoordinateSystemNode",
    create: () => new CoordinateSystemNode(videoLoadedProperty, overlayTools, sharedTracking.activeTrackIdProperty),
    keepAlive: () => [videoLoadedProperty, overlayTools, sharedTracking],
  },
  {
    name: "TrackListPanel",
    create: () => {
      sharedTracking.addTrack();
      return new TrackListPanel(sharedTracking, videoLoadedProperty);
    },
    keepAlive: () => [videoLoadedProperty, sharedTracking],
  },
]);

// TrackListPanel rebuilds every TrackRowNode whenever a track is added or removed. Each row
// links to activeTrackIdProperty and derives its checkbox / trash-button accessible names
// from the global a11y string Properties, so a row that is replaced without disposal leaks.
// memory-leak-covers: TrackRowNode (private row owned by TrackListPanel)
describe("TrackRowNode rebuilds in TrackListPanel", () => {
  const a11yStrings = StringManager.getInstance().getA11y();

  /** The TrackRowNode instances currently in the panel (the class is private to TrackListPanel). */
  function trackRows(root: Node): Node[] {
    const rows: Node[] = [];
    const visit = (node: Node): void => {
      if (node.constructor.name === "TrackRowNode") {
        rows.push(node);
      }
      node.children.forEach(visit);
    };
    visit(root);
    return rows;
  }

  /** Add two tracks, digitize one, then remove both: three rebuilds of the row list. */
  function addAndRemoveTracks(tracking: TrackingModel): void {
    tracking.addTrack();
    tracking.addTrack();
    const [first, second] = tracking.tracksProperty.value;
    tracking.activeTrackIdProperty.value = first!.id;
    tracking.removeTrack(first!.id);
    tracking.removeTrack(second!.id);
  }

  it("add/remove cycles leave no listeners on string or model Properties", async () => {
    const tracking = new TrackingModel();
    const panel = new TrackListPanel(tracking, videoLoadedProperty);
    tracking.addTrack(); // a surviving row is rebuilt on every change, too
    await expectNoListenerGrowth(
      [
        a11yStrings.digitizeTrackStringProperty,
        a11yStrings.removeTrackStringProperty,
        tracking.activeTrackIdProperty,
        tracking.tracksProperty,
      ],
      () => addAndRemoveTracks(tracking),
    );
    expect(trackRows(panel)).toHaveLength(1);
    panel.dispose();
  });

  it("replaced rows are garbage-collected while the panel and model stay alive", async () => {
    const tracking = new TrackingModel();
    const panel = new TrackListPanel(tracking, videoLoadedProperty);
    const collectReplacedRows = (): WeakRef<object>[] => {
      const refs: WeakRef<object>[] = [];
      for (let i = 0; i < 3; i++) {
        tracking.addTrack();
        refs.push(...trackRows(panel).map((row) => new WeakRef<object>(row)));
        tracking.removeTrack(tracking.tracksProperty.value.at(-1)!.id);
      }
      return refs;
    };
    const refs = collectReplacedRows();
    expect(refs.length).toBeGreaterThan(0);
    await forceGC(refs);
    expect(refs.filter((ref) => ref.deref() !== undefined).length, "replaced TrackRowNodes retained").toBe(0);
    expect(trackRows(panel)).toHaveLength(0);
    panel.dispose();
  });
});

describe("video-panel components leave no listeners on string, accessible-name or model Properties", () => {
  it.each([
    ["AutoTrackerNode", createAutoTrackerNode, autoTrackerLinkedProperties],
    ["DigitizingOverlayNode", createDigitizingOverlayNode, digitizingOverlayLinkedProperties],
    ["DataTableNode", createDataTableNode, dataTableLinkedProperties],
    ["WebcamPanel", createWebcamPanel, webcamPanelLinkedProperties],
  ] as const)("%s", async (_name, create, linkedProperties) => {
    await expectNoListenerGrowth(linkedProperties, () => {
      create().dispose();
    });
  });
});

// ── VideoSourceControlNode and VideoPlayerNode ───────────────────────────────
// VideoPlayerNode is built once by TrackLabScreenView and never disposed while
// the sim runs; these cases prove its teardown (and its source controls') would
// release everything if it were.

const videoSourceStrings = stringManager.getVideoSource();
const uiStrings = stringManager.getUI();
const videoPlayerA11y = stringManager.getA11y();
const sourceListParent = new Node();
const sourceVideoContentVisibleProperty = new BooleanProperty(true);
const sourceVideoLoadedProperty = new BooleanProperty(true);

/** Sim-lifetime string, accessible-name and model Properties VideoSourceControlNode links to. */
const videoSourceControlLinkedProperties: readonly object[] = [
  ...Object.values(stringManager.getVideoFiles()),
  uiStrings.selectVideoStringProperty,
  uiStrings.sampleVideosStringProperty,
  uiStrings.myRecordingsStringProperty,
  uiStrings.uploadedVideosStringProperty,
  videoSourceStrings.downloadVideoStringProperty,
  videoSourceStrings.openVideoFileStringProperty,
  videoSourceStrings.recordWebcamStringProperty,
  videoPlayerA11y.toggleVideoVisibilityStringProperty,
  trackLabModel.sources.webcamRecordingsProperty,
  trackLabModel.sources.uploadedVideosProperty,
  trackLabModel.sources.isUserVideoProperty,
  trackLabModel.playback.isPlayingProperty,
  trackLabModel.playback.frameRateProperty,
  sourceVideoContentVisibleProperty,
  sourceVideoLoadedProperty,
  // The WebcamPanel it creates.
  ...webcamPanelLinkedProperties.filter((property) => property !== webcamFrameRateProperty),
];

const createVideoSourceControlNode = () =>
  new VideoSourceControlNode(
    trackLabModel.sources,
    trackLabModel.playback.isPlayingProperty,
    trackLabModel,
    trackLabModel.playback.frameRateProperty,
    sourceListParent,
    noop,
    noop,
    sourceVideoContentVisibleProperty,
    sourceVideoLoadedProperty,
  );

/** Sim-lifetime Properties VideoPlayerNode links to, itself and through the components it owns. */
const videoPlayerLinkedProperties: readonly object[] = [
  videoPlayerA11y.videoPlayerStringProperty,
  videoPlayerA11y.videoPanelHandleStringProperty,
  videoPlayerA11y.videoPanelResizeHandleStringProperty,
  stringManager.getVideo().loadFailedStringProperty,
  trackLabModel.overlayTools.videoContentVisibleProperty,
  trackLabModel.overlayTools.autoTrackingProperty,
  trackLabModel.playback.videoLoadedProperty,
  trackLabModel.playback.playbackRateProperty,
  trackLabModel.playback.panelSizeScaleProperty,
  trackLabModel.playback.videoTransformProperty,
  // Linked by hand to style the <video> element and the header / resize handle.
  TrackLabColors.videoBackgroundColorProperty,
  TrackLabColors.panelHeaderColorProperty,
  TrackLabColors.resizeHandleColorProperty,
  // The resize handle's keyboard drag hotkeys derive from these module-level key strings.
  ...(KeyboardDragDirectionToKeyStringPropertiesMap.get("leftRight") ?? []),
  ...digitizingOverlayLinkedProperties,
  ...videoSourceControlLinkedProperties.filter(
    (property) => property !== sourceVideoContentVisibleProperty && property !== sourceVideoLoadedProperty,
  ),
];

const videoPlayerListParent = new Node();
const createVideoPlayerNode = () => new VideoPlayerNode(trackLabModel, videoPlayerListParent);

/** The node's own <video> element (private; read here to check it is released). */
function videoElementOf(node: VideoPlayerNode): HTMLVideoElement {
  return (node as unknown as { videoElement: HTMLVideoElement }).videoElement;
}

describeDisposalLeaks([
  {
    name: "VideoSourceControlNode",
    create: createVideoSourceControlNode,
    keepAlive: () => [trackLabModel, sourceListParent, ...videoSourceControlLinkedProperties],
  },
  {
    name: "VideoPlayerNode",
    create: createVideoPlayerNode,
    keepAlive: () => [trackLabModel, videoPlayerListParent, ...videoPlayerLinkedProperties],
  },
]);

describe("VideoSourceControlNode", () => {
  it("leaves no listeners on string, accessible-name or model Properties", async () => {
    await expectNoListenerGrowth(videoSourceControlLinkedProperties, () => {
      createVideoSourceControlNode().dispose();
    });
  });

  it("removes its hidden file input from the document", () => {
    const before = document.querySelectorAll("input[type=file]").length;
    const node = createVideoSourceControlNode();
    expect(document.querySelectorAll("input[type=file]").length).toBe(before + 1);
    node.dispose();
    expect(document.querySelectorAll("input[type=file]").length).toBe(before);
  });
});

describe("VideoPlayerNode", () => {
  it("leaves no listeners on string, accessible-name or model Properties", async () => {
    await expectNoListenerGrowth(videoPlayerLinkedProperties, () => {
      createVideoPlayerNode().dispose();
    });
  });

  it("stops handling document keydown after dispose", () => {
    const seekToStart = vi.spyOn(trackLabModel.playback, "seekToStart");
    const { durationProperty } = trackLabModel.playback;
    const initialDuration = durationProperty.value;
    try {
      durationProperty.value = 10; // the Home shortcut only acts once a video is loaded
      const node = createVideoPlayerNode();
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Home" }));
      expect(seekToStart).toHaveBeenCalledTimes(1);
      node.dispose();
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Home" }));
      expect(seekToStart).toHaveBeenCalledTimes(1);
    } finally {
      durationProperty.value = initialDuration;
      seekToStart.mockRestore();
    }
  });

  it("releases its video element and blob URL on dispose", () => {
    const node = createVideoPlayerNode();
    const video = videoElementOf(node);
    video.src = "blob:track-lab-test";
    // A stand-in for a live MediaStream; dispose() must detach it too.
    video.srcObject = new MediaStream();
    (node as unknown as { currentBlobUrl: string | null }).currentBlobUrl = "blob:track-lab-test";
    const pause = vi.spyOn(video, "pause");
    const revoke = vi.spyOn(URL, "revokeObjectURL");
    try {
      node.dispose();
      expect(pause).toHaveBeenCalled();
      expect(video.hasAttribute("src")).toBe(false);
      expect(video.srcObject).toBeNull();
      expect(revoke).toHaveBeenCalledWith("blob:track-lab-test");
    } finally {
      revoke.mockRestore();
    }
  });
});
