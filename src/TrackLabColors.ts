/**
 * TrackLabColors.ts
 *
 * Central location for all colors used in the TrackLab Simulations, providing
 * support for different color profiles (default and projector mode).
 */

import { Color, ProfileColorProperty } from "scenerystack/scenery";
import TrackLabNamespace from "./TrackLabNamespace.js";

// ── Base colors ───────────────────────────────────────────────────────────
const BLACK = new Color(0, 0, 0);
const WHITE = new Color(255, 255, 255);

// ── ProfileColorProperty factory ──────────────────────────────────────────
// ── Track colour palette (one CSS color per symbol A–Z) ─────────────────────
// 26 distinct, high-contrast colours so every possible track has a unique hue.
export const TRACK_COLORS = [
  new Color(255, 140, 0), // A – orange
  new Color(0, 188, 212), // B – cyan
  new Color(233, 30, 140), // C – magenta
  new Color(156, 39, 176), // D – purple
  new Color(205, 220, 57), // E – lime-yellow
  new Color(0, 229, 255), // F – light cyan
  new Color(255, 87, 34), // G – deep orange
  new Color(118, 255, 3), // H – light green
  new Color(244, 67, 54), // I – red
  new Color(63, 81, 181), // J – indigo
  new Color(0, 150, 136), // K – teal
  new Color(255, 235, 59), // L – yellow
  new Color(121, 85, 72), // M – brown
  new Color(96, 125, 139), // N – blue-grey
  new Color(233, 30, 99), // O – pink
  new Color(33, 150, 243), // P – blue
  new Color(139, 195, 74), // Q – light green (darker)
  new Color(255, 193, 7), // R – amber
  new Color(0, 188, 84), // S – green
  new Color(121, 134, 203), // T – periwinkle
  new Color(255, 112, 67), // U – deep orange (lighter)
  new Color(77, 208, 225), // V – light teal
  new Color(174, 213, 129), // W – sage
  new Color(240, 98, 146), // X – light pink
  new Color(129, 212, 250), // Y – sky blue
  new Color(178, 132, 190), // Z – lavender
];

/** Returns the Color for a track, guaranteed non-null (falls back to orange if index is out of range). */
export function getTrackColor(colorIndex: number): Color {
  return TRACK_COLORS[colorIndex % TRACK_COLORS.length] ?? TRACK_COLORS[0] ?? new Color(255, 140, 0);
}

/**
 * Color definitions for the TrackLab Simulations
 */
const TrackLabColors = {
  // Background
  backgroundColorProperty: new ProfileColorProperty(TrackLabNamespace, "backgroundColor", {
    default: BLACK,
    projector: WHITE,
  }),

  // Video element background (HTML style.background)
  videoBackgroundColorProperty: new ProfileColorProperty(TrackLabNamespace, "videoBackground", {
    default: BLACK,
    projector: new Color(30, 30, 30),
  }),

  // Panels (ControlPanel, CalibrationToolNode midpoint, TrackListPanel, DataTableNode)
  // Dark panels on dark background (default) and light panels on light background (projector)
  panelFillProperty: new ProfileColorProperty(TrackLabNamespace, "panelFill", {
    default: new Color(25, 25, 45, 0.95),
    projector: new Color(245, 245, 250, 0.98),
  }), // Darker, more opaque for better contrast with white text; Light panel for projector mode with black text
  // Webcam panel overlay (more opaque)
  webcamPanelFillProperty: new ProfileColorProperty(TrackLabNamespace, "webcamPanelFill", {
    default: new Color(25, 25, 45, 0.98),
    projector: new Color(245, 245, 250, 0.99),
  }), // More opaque for webcam panel; More opaque light panel for projector
  panelStrokeProperty: new ProfileColorProperty(TrackLabNamespace, "panelStroke", {
    default: new Color(120, 120, 140),
    projector: new Color(180, 180, 200),
  }), // Lighter stroke for better contrast on dark panel; Darker stroke for better contrast on light panel
  panelStrokeLightProperty: new ProfileColorProperty(TrackLabNamespace, "panelStrokeLight", {
    default: new Color(150, 150, 170),
    projector: new Color(160, 160, 180),
  }), // Lighter stroke for better visibility; Darker stroke for light panel

  // Axes (X red, Y green)
  axisXColorProperty: new ProfileColorProperty(TrackLabNamespace, "axisX", {
    default: new Color(255, 68, 68, 0.85),
    projector: new Color(238, 51, 51, 0.85),
  }),
  axisYColorProperty: new ProfileColorProperty(TrackLabNamespace, "axisY", {
    default: new Color(68, 204, 68, 0.85),
    projector: new Color(51, 187, 51, 0.85),
  }),

  // Calibration tool (bright colors with shadows for visibility on all backgrounds)
  calibrationFillProperty: new ProfileColorProperty(TrackLabNamespace, "calibrationFill", {
    default: new Color(0, 255, 255, 0.3),
    projector: new Color(255, 0, 255, 0.3),
  }), // Bright cyan - semi-transparent for positioning; Bright magenta - semi-transparent for positioning
  calibrationStrokeProperty: new ProfileColorProperty(TrackLabNamespace, "calibrationStroke", {
    default: new Color(0, 255, 255),
    projector: new Color(255, 0, 255),
  }), // Bright cyan; Bright magenta
  // Shadow stroke for maximum contrast on all backgrounds
  calibrationShadowStrokeProperty: new ProfileColorProperty(TrackLabNamespace, "calibrationShadowStroke", {
    default: new Color(0, 0, 0, 0.9),
    projector: new Color(0, 0, 0, 0.9),
  }), // Dark shadow; Dark shadow
  calibrationHandleProperty: new ProfileColorProperty(TrackLabNamespace, "calibrationHandle", {
    default: new Color(0, 255, 255, 0.4),
    projector: new Color(255, 0, 255, 0.4),
  }), // Bright cyan - semi-transparent; Bright magenta - semi-transparent

  // Auto-tracker overlay
  trackerHintFillProperty: new ProfileColorProperty(TrackLabNamespace, "trackerHintFill", {
    default: new Color(255, 255, 100, 0.9),
    projector: new Color(255, 255, 120, 0.95),
  }),
  trackerSelectionStrokeProperty: new ProfileColorProperty(TrackLabNamespace, "trackerSelectionStroke", {
    default: new Color(255, 255, 0, 0.9),
    projector: new Color(255, 255, 50, 0.95),
  }),
  trackerSelectionFillProperty: new ProfileColorProperty(TrackLabNamespace, "trackerSelectionFill", {
    default: new Color(255, 255, 0, 0.08),
    projector: new Color(255, 255, 50, 0.12),
  }),
  trackerTrailFillProperty: new ProfileColorProperty(TrackLabNamespace, "trackerTrailFill", {
    default: new Color(0, 255, 128, 0.75),
    projector: new Color(0, 255, 140, 0.85),
  }),
  trackerCrosshairStrokeProperty: new ProfileColorProperty(TrackLabNamespace, "trackerCrosshairStroke", {
    default: new Color(255, 60, 60, 0.95),
    projector: new Color(255, 80, 80, 0.98),
  }),
  trackerBadgeFillProperty: new ProfileColorProperty(TrackLabNamespace, "trackerBadgeFill", {
    default: new Color(0, 0, 0, 0.65),
    projector: new Color(240, 240, 240, 0.88),
  }),

  // Control panel icons
  iconGrayProperty: new ProfileColorProperty(TrackLabNamespace, "iconGray", {
    default: new Color(187, 187, 187),
    projector: new Color(100, 100, 100),
  }),
  checkboxColorProperty: new ProfileColorProperty(TrackLabNamespace, "checkboxColor", {
    default: new Color(255, 255, 255),
    projector: new Color(40, 40, 40),
  }),
  checkboxColorBackgroundProperty: new ProfileColorProperty(TrackLabNamespace, "checkboxColorBackground", {
    default: new Color(80, 80, 100, 0.4),
    projector: new Color(200, 200, 220, 0.5),
  }),
  // Preferences checkboxes (fixed appearance, don't change with profile)
  checkboxPreferencesColorProperty: new ProfileColorProperty(TrackLabNamespace, "checkboxPreferencesColor", {
    default: new Color(40, 40, 40),
    projector: new Color(40, 40, 40),
  }),
  checkboxPreferencesColorBackgroundProperty: new ProfileColorProperty(
    TrackLabNamespace,
    "checkboxPreferencesColorBackground",
    { default: new Color(200, 200, 220, 0.5), projector: new Color(200, 200, 220, 0.5) },
  ),

  // Coordinate system - semi-transparent origin for better positioning
  originFillProperty: new ProfileColorProperty(TrackLabNamespace, "originFill", {
    default: new Color(255, 255, 255, 0.4),
    projector: new Color(240, 240, 240, 0.4),
  }), // 40% opacity white
  originStrokeProperty: new ProfileColorProperty(TrackLabNamespace, "originStroke", {
    default: new Color(119, 119, 119, 0.8),
    projector: new Color(70, 70, 70, 0.8),
  }), // 80% opacity stroke for visibility
  // Shadow/outline stroke for coordinate system (contrast on all backgrounds)
  coordShadowStrokeProperty: new ProfileColorProperty(TrackLabNamespace, "coordShadowStroke", {
    default: new Color(0, 0, 0, 0.8),
    projector: new Color(0, 0, 0, 0.8),
  }), // Dark shadow for contrast on light backgrounds

  // Buttons
  buttonBaseDarkProperty: new ProfileColorProperty(TrackLabNamespace, "buttonBaseDark", {
    default: new Color(51, 51, 102),
    projector: new Color(220, 220, 235),
  }), // Much lighter for projector mode
  // Matches scenery-phet's default ColorConstants.LIGHT_BLUE used by the
  // play/pause and step buttons inside TimeControlNode.
  playbackButtonBaseProperty: new ProfileColorProperty(TrackLabNamespace, "playbackButtonBase", {
    default: new Color(153, 206, 255),
    projector: new Color(153, 206, 255),
  }),
  // Icon/glyph on the light-blue playback buttons (stays dark in both profiles).
  playbackButtonIconColorProperty: new ProfileColorProperty(TrackLabNamespace, "playbackButtonIcon", {
    default: BLACK,
    projector: BLACK,
  }),
  // Darker sibling of buttonBaseDark — must lighten in projector so textOnDark
  // (white→black) stays readable, matching buttonBaseDark / comboBox fills.
  buttonBaseDarkerProperty: new ProfileColorProperty(TrackLabNamespace, "buttonBaseDarker", {
    default: new Color(51, 51, 68),
    projector: new Color(200, 200, 220),
  }), // Light enough for black textOnDark in projector
  buttonRecordProperty: new ProfileColorProperty(TrackLabNamespace, "buttonRecord", {
    default: new Color(204, 0, 0),
    projector: new Color(238, 0, 0),
  }),
  buttonStopProperty: new ProfileColorProperty(TrackLabNamespace, "buttonStop", {
    default: new Color(136, 0, 0),
    projector: new Color(170, 0, 0),
  }),
  buttonSuccessProperty: new ProfileColorProperty(TrackLabNamespace, "buttonSuccess", {
    default: new Color(34, 170, 34),
    projector: new Color(60, 204, 60),
  }),

  // ComboBox
  comboBoxButtonFillProperty: new ProfileColorProperty(TrackLabNamespace, "comboBoxButtonFill", {
    default: new Color(51, 51, 102),
    projector: new Color(220, 220, 235),
  }), // Much lighter for projector mode
  comboBoxListFillProperty: new ProfileColorProperty(TrackLabNamespace, "comboBoxListFill", {
    default: new Color(51, 51, 102),
    projector: new Color(240, 240, 250),
  }), // Much lighter for projector mode
  comboBoxHighlightFillProperty: new ProfileColorProperty(TrackLabNamespace, "comboBoxHighlightFill", {
    default: new Color(68, 68, 136),
    projector: new Color(200, 200, 220),
  }), // Much lighter for projector mode

  // Text / labels
  textMutedProperty: new ProfileColorProperty(TrackLabNamespace, "textMuted", {
    default: new Color(221, 221, 221),
    projector: new Color(100, 100, 100),
  }),
  textOnDarkProperty: new ProfileColorProperty(TrackLabNamespace, "textOnDark", { default: WHITE, projector: BLACK }),

  // Digitizing overlay (manual point placement)
  digitizingCursorStrokeProperty: new ProfileColorProperty(TrackLabNamespace, "digitizingCursorStroke", {
    default: WHITE,
    projector: new Color(40, 40, 40),
  }),
  digitizingMagnifierBorderProperty: new ProfileColorProperty(TrackLabNamespace, "digitizingMagnifierBorder", {
    default: WHITE,
    projector: new Color(40, 40, 40),
  }),
  digitizingMagnifierCrosshairProperty: new ProfileColorProperty(TrackLabNamespace, "digitizingMagnifierCrosshair", {
    default: new Color(255, 255, 255, 0.8),
    projector: new Color(40, 40, 40, 0.9),
  }),
  digitizingMagnifierShadowProperty: new ProfileColorProperty(TrackLabNamespace, "digitizingMagnifierShadow", {
    default: new Color(0, 0, 0, 0.5),
    projector: new Color(0, 0, 0, 0.3),
  }),

  // Data table
  tableHeaderBackgroundProperty: new ProfileColorProperty(TrackLabNamespace, "tableHeaderBackground", {
    default: new Color(68, 114, 196),
    projector: new Color(55, 90, 160),
  }),
  tableHeaderTextProperty: new ProfileColorProperty(TrackLabNamespace, "tableHeaderText", {
    default: WHITE,
    projector: WHITE,
  }),
  tableRowOddProperty: new ProfileColorProperty(TrackLabNamespace, "tableRowOdd", {
    default: WHITE,
    projector: new Color(250, 250, 250),
  }),
  tableRowEvenProperty: new ProfileColorProperty(TrackLabNamespace, "tableRowEven", {
    default: new Color(235, 241, 251),
    projector: new Color(230, 238, 250),
  }),
  tableGridStrokeProperty: new ProfileColorProperty(TrackLabNamespace, "tableGridStroke", {
    default: new Color(176, 176, 176),
    projector: new Color(160, 160, 160),
  }),
  tableEmptyTextProperty: new ProfileColorProperty(TrackLabNamespace, "tableEmptyText", {
    default: new Color(136, 136, 136),
    projector: new Color(120, 120, 120),
  }),
  tableSymbolShadowProperty: new ProfileColorProperty(TrackLabNamespace, "tableSymbolShadow", {
    default: new Color(0, 0, 0, 0.5),
    projector: new Color(0, 0, 0, 0.3),
  }),
  tableBackgroundProperty: new ProfileColorProperty(TrackLabNamespace, "tableBackground", {
    default: WHITE,
    projector: new Color(250, 250, 250),
  }),
  // Outline marking the row for the frame the video is parked on.
  tableCurrentRowProperty: new ProfileColorProperty(TrackLabNamespace, "tableCurrentRow", {
    default: new Color(232, 119, 34),
    projector: new Color(214, 100, 20),
  }),
  exportButtonProperty: new ProfileColorProperty(TrackLabNamespace, "exportButton", {
    default: new Color(76, 175, 80),
    projector: new Color(60, 150, 65),
  }),

  // Graph (ConfigurableGraph, GraphDataManager, GraphControlsPanel)
  graphBackgroundProperty: new ProfileColorProperty(TrackLabNamespace, "graphBackground", {
    default: new Color(25, 25, 45, 0.95),
    projector: new Color(245, 245, 250, 0.98),
  }),
  controlPanelFillProperty: new ProfileColorProperty(TrackLabNamespace, "controlPanelFill", {
    default: new Color(35, 35, 55, 0.95),
    projector: new Color(235, 235, 245, 0.98),
  }),
  controlPanelStrokeProperty: new ProfileColorProperty(TrackLabNamespace, "controlPanelStroke", {
    default: new Color(120, 120, 140),
    projector: new Color(180, 180, 200),
  }),
  gridLinesProperty: new ProfileColorProperty(TrackLabNamespace, "gridLines", {
    default: new Color(80, 80, 100),
    projector: new Color(200, 200, 220),
  }),
  textProperty: new ProfileColorProperty(TrackLabNamespace, "text", { default: WHITE, projector: BLACK }),
  plot1Property: new ProfileColorProperty(TrackLabNamespace, "plot1", {
    default: new Color(0, 188, 212),
    projector: new Color(0, 150, 180),
  }), // Cyan – visible on dark background

  // Measuring tape overlay
  measuringTapeColorProperty: new ProfileColorProperty(TrackLabNamespace, "measuringTapeColor", {
    default: new Color(240, 185, 55),
    projector: new Color(220, 170, 40),
  }),
  measuringTapeShadowProperty: new ProfileColorProperty(TrackLabNamespace, "measuringTapeShadow", {
    default: new Color(0, 0, 0, 0.45),
    projector: new Color(0, 0, 0, 0.45),
  }),

  // Angle tool overlay
  angleToolColorProperty: new ProfileColorProperty(TrackLabNamespace, "angleToolColor", {
    default: new Color(170, 100, 255),
    projector: new Color(150, 80, 230),
  }),
  angleToolShadowProperty: new ProfileColorProperty(TrackLabNamespace, "angleToolShadow", {
    default: new Color(0, 0, 0, 0.45),
    projector: new Color(0, 0, 0, 0.45),
  }),

  // Shared overlay handle outline (used by measuring tape and angle tool endpoints)
  overlayHandleOutlineProperty: new ProfileColorProperty(TrackLabNamespace, "overlayHandleOutline", {
    default: new Color(0, 0, 0, 0.65),
    projector: new Color(0, 0, 0, 0.65),
  }),

  // Shared overlay icon shadow (used by measurement tool panel icons)
  iconShadowProperty: new ProfileColorProperty(TrackLabNamespace, "iconShadow", {
    default: new Color(0, 0, 0, 0.5),
    projector: new Color(0, 0, 0, 0.5),
  }),

  // Calibration tool warning (endpoints too close)
  calibrationWarningColorProperty: new ProfileColorProperty(TrackLabNamespace, "calibrationWarningColor", {
    default: new Color(255, 60, 60),
    projector: new Color(255, 60, 60),
  }),

  // Track list panel
  trashIconProperty: new ProfileColorProperty(TrackLabNamespace, "trashIcon", {
    default: new Color(255, 200, 200),
    projector: new Color(255, 255, 255),
  }),
  trashButtonBaseProperty: new ProfileColorProperty(TrackLabNamespace, "trashButtonBase", {
    default: new Color(160, 40, 40),
    projector: new Color(190, 50, 50),
  }),
  trackSymbolTextProperty: new ProfileColorProperty(TrackLabNamespace, "trackSymbolText", {
    default: WHITE,
    projector: WHITE,
  }),

  // Video panel header (drag bar between source controls and video content)
  panelHeaderColorProperty: new ProfileColorProperty(TrackLabNamespace, "panelHeaderColor", {
    default: new Color(50, 50, 80, 0.85),
    projector: new Color(200, 200, 220, 0.85),
  }), // subtle tint on dark background; subtle tint on light background

  // Resize handle knob (bottom-right corner of video content)
  resizeHandleColorProperty: new ProfileColorProperty(TrackLabNamespace, "resizeHandleColor", {
    default: new Color(120, 160, 220, 0.9),
    projector: new Color(60, 100, 180, 0.85),
  }), // accent blue for visibility on dark; deeper blue for projector mode

  // Preferences dialog
  preferencesTextProperty: new ProfileColorProperty(TrackLabNamespace, "preferencesText", {
    default: BLACK,
    projector: BLACK,
  }),
  preferencesTextSecondaryProperty: new ProfileColorProperty(TrackLabNamespace, "preferencesTextSecondary", {
    default: new Color(102, 102, 102),
    projector: new Color(80, 80, 80),
  }),

  // Fleet-standard aliases for shared Panel + ButtonOptions modules.
  panelBackgroundColorProperty: new ProfileColorProperty(TrackLabNamespace, "panelBackground", {
    default: new Color(25, 25, 45, 0.95),
    projector: new Color(245, 245, 250, 0.98),
  }),
  panelBorderColorProperty: new ProfileColorProperty(TrackLabNamespace, "panelBorder", {
    default: new Color(120, 120, 140),
    projector: new Color(180, 180, 200),
  }),
  textColorProperty: new ProfileColorProperty(TrackLabNamespace, "textColor", { default: WHITE, projector: BLACK }),

  // ── Light control surfaces ───────────────────────────────────────────────────
  // White chrome (combo boxes, flat push buttons, editable input fields) stays light
  // in both profiles; its text stays dark.

  /** Fill of light control surfaces: combo-box button/list, editable input fields. */
  controlSurfaceColorProperty: new ProfileColorProperty(TrackLabNamespace, "controlSurface", {
    default: "#ffffff",
    projector: "#ffffff",
  }),

  /** Fill of a disabled control surface (grayed-out editable input field). */
  controlSurfaceDisabledColorProperty: new ProfileColorProperty(TrackLabNamespace, "controlSurfaceDisabled", {
    default: "#cccccc",
    projector: "#cccccc",
  }),

  /** Text on light control surfaces: combo items, flat-button labels, field values, preferences. */
  controlSurfaceTextColorProperty: new ProfileColorProperty(TrackLabNamespace, "controlSurfaceText", {
    default: "#1a1a1a",
    projector: "#1a1a1a",
  }),
};

export default TrackLabColors;
