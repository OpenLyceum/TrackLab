import fs from "node:fs";
import type { ServerResponse } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import type { Plugin, Rolldown, ViteDevServer } from "vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import packageJson from "./package.json" with { type: "json" };
import { pwaOptions, simMetadataHtml } from "./scripts/pwa-config.js";
import simConfigJson from "./sim.config.json" with { type: "json" };

/**
 * TrackLab carve-out of the template's vite.config.ts (see AGENTS.md).
 * Shares the template PWA options. Deltas: OpenCV/video plugins, WASM/blob CSP,
 * and Workbox globIgnores/runtimeCaching. No `--mode single` (OpenCV + videos
 * cannot collapse into one HTML file).
 */
type SimConfig = {
  /** PWA `name` and screenshot labels, e.g. "Doppler Effect". */
  title: string;
  /** PWA `short_name` (home-screen label): 30 characters max; launchers truncate past ~12. */
  shortName: string;
  themeColor: string;
  backgroundColor: string;
  /** Browser features the sim calls; each becomes `<feature>=(self)` in Permissions-Policy. */
  allowPermissions: PermissionFeature[];
  /** Extra https:// origins the sim fetches from at runtime, appended to CSP connect-src. */
  connectSrc: string[];
  /** Extra file extensions (no dot) for the Workbox precache, e.g. bundled audio. */
  precacheExtensions: string[];
  pwaId?: string;
};

const PERMISSION_FEATURES = ["camera", "microphone", "geolocation"] as const;
type PermissionFeature = (typeof PERMISSION_FEATURES)[number];

const SIM_CONFIG_KEYS: ReadonlySet<string> = new Set([
  "$comment",
  "title",
  "shortName",
  "themeColor",
  "backgroundColor",
  "allowPermissions",
  "connectSrc",
  "precacheExtensions",
  "pwaId",
]);

/** Validate `sim.config.json` strictly so a typo or an invented key fails the build instead of being ignored. */
function parseSimConfig(raw: Record<string, unknown>): SimConfig {
  const problems: string[] = [];
  for (const key of Object.keys(raw)) {
    if (!SIM_CONFIG_KEYS.has(key)) {
      problems.push(`unknown key "${key}"`);
    }
  }
  const text = (key: string, pattern: RegExp, hint: string): string => {
    const value = raw[key];
    if (typeof value !== "string" || !pattern.test(value)) {
      problems.push(`"${key}" must be ${hint}`);
      return "";
    }
    return value;
  };
  const list = (key: string, pattern: RegExp, hint: string): string[] => {
    const value = raw[key];
    if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !pattern.test(item))) {
      problems.push(`"${key}" must be an array of ${hint}`);
      return [];
    }
    return value as string[];
  };
  const hexColor = /^#[0-9a-f]{6}$/i;
  const config: SimConfig = {
    title: text("title", /^\S.{0,59}$/, "a non-empty display name (60 characters max)"),
    shortName: text("shortName", /^\S.{0,29}$/, "a non-empty label (30 characters max)"),
    themeColor: text("themeColor", hexColor, "a #rrggbb color"),
    backgroundColor: text("backgroundColor", hexColor, "a #rrggbb color"),
    allowPermissions: list(
      "allowPermissions",
      new RegExp(`^(?:${PERMISSION_FEATURES.join("|")})$`),
      PERMISSION_FEATURES.join(" | "),
    ) as PermissionFeature[],
    connectSrc: list("connectSrc", /^https:\/\/[a-z0-9.-]+(?::\d+)?$/, "bare https:// origins (no path, no wildcard)"),
    precacheExtensions: list("precacheExtensions", /^[a-z0-9]{1,8}$/, "lowercase extensions without a dot"),
  };
  if (raw["pwaId"] !== undefined) {
    config.pwaId = text("pwaId", /^\/?[a-z0-9][a-z0-9._-]*$/i, "the existing app ID or its root-relative path");
  }
  if (problems.length > 0) {
    throw new Error(`sim.config.json is invalid:\n  - ${problems.join("\n  - ")}`);
  }
  return config;
}

const simConfig: SimConfig = parseSimConfig(simConfigJson);

/**
 * Content-Security-Policy directives: restrict resource loading to same-origin +
 * known blob/data exceptions. Sent as a header by the dev and preview servers and,
 * because GitHub Pages cannot send headers, written into the built index.html as a
 * `<meta>` tag by `cspMetaTag()` below.
 *
 * TrackLab deltas vs the template: `'wasm-unsafe-eval'` for OpenCV WASM, `blob:` on
 * img-src (video frames / CSV download previews), and `data:` on connect-src
 * (`@techstark/opencv-js` loads WASM as a base64 data URI).
 */
const cspDirectives: readonly string[] = [
  "default-src 'self'",
  // TODO(scenerystack): drop 'unsafe-eval' when SceneryStack no longer needs
  // Function/eval for query-parameter parsing — reopen a CSP audit then.
  // 'unsafe-eval' is required for SceneryStack query parameter parsing
  // 'wasm-unsafe-eval' is required for the OpenCV WASM module
  "script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval'",
  // Event-handler attributes are governed by script-src-attr, separately from
  // inline <script>. SceneryStack's ParallelDOM.pdomInputEnabledListener sets an
  // inline `onclick` on any control whose input it disables (`return false`, then
  // `""` when re-enabled) — e.g. the time-control step button whenever the clock
  // starts or stops. 'unsafe-hashes' lets exactly those two handlers through;
  // anything else still fails. Without it the fuzz suite fails on the CSP console
  // error. Regenerate: printf 'return false' | openssl dgst -sha256 -binary | base64
  "script-src-attr 'unsafe-hashes' " +
    "'sha256-GZIcz60Uwd6wT3vaYke/atSr53TehbYAPepOa3d03Vw=' " +
    "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='",
  // OpenCV spins up blob: workers
  "worker-src blob: 'self'",
  // TODO(scenerystack): drop 'unsafe-inline' when SceneryStack stops setting
  // element.style / cssText for theming (same CSP revisit as unsafe-eval).
  // Inline styles are set via element.style / cssText throughout the UI layer
  "style-src 'self' 'unsafe-inline'",
  // data: for icons; blob: for video playback frames and CSV download previews
  "img-src 'self' blob: data:",
  // blob: for webcam recordings and loaded video files
  "media-src 'self' blob:",
  // blob: for fetch inside workers
  // data: required for @techstark/opencv-js which loads its WASM as a base64 data URI
  // plus any runtime https:// origins the sim declares in sim.config.json
  ["connect-src 'self' blob: data:", ...simConfig.connectSrc].join(" "),
  // data: because the build (never the dev server) inlines assets under 4 kB as data: URIs,
  // e.g. KaTeX's small .woff2 fonts in the built CSS. A data: URI cannot reach another origin.
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  // Header only: browsers ignore frame-ancestors in a <meta> CSP (and log a console
  // error), so the deployed sims stay embeddable in the textbooks' iframes.
  "frame-ancestors 'none'",
];

/** Directives a `<meta>` CSP cannot carry (CSP3 §6.2: ignored with a console error). */
const HEADER_ONLY_CSP_DIRECTIVES: ReadonlySet<string> = new Set(["frame-ancestors", "report-uri", "sandbox"]);

/**
 * Security headers for the dev and preview servers:
 *  - COOP/COEP: SharedArrayBuffer support (dev/preview only: GitHub Pages cannot
 *    send them, so `crossOriginIsolated` is false on the deployed sims)
 *  - CSP: see `cspDirectives`
 *  - Referrer / Permissions: tighten default browser leakage
 *  - X-Content-Type-Options: prevent MIME sniffing
 *  - X-Frame-Options: prevent clickjacking (belt-and-suspenders alongside frame-ancestors)
 */
const securityHeaders: Record<string, string> = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Content-Security-Policy": cspDirectives.join("; "),
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Locked by default. A sim that calls getUserMedia / geolocation lists the feature
  // in sim.config.json: a locked policy logs a console error per request and fails fuzz.
  "Permissions-Policy": PERMISSION_FEATURES.map(
    (feature) => `${feature}=(${simConfig.allowPermissions.includes(feature) ? "self" : ""})`,
  ).join(", "),
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

/**
 * Write the CSP into the built `index.html` as the first `<head>` element, so the
 * policy also holds on GitHub Pages, which cannot send response headers. Only the
 * CSP has a `<meta>` form; Permissions-Policy, COOP/COEP, X-Frame-Options and
 * X-Content-Type-Options stay dev/preview-only.
 */
function cspMetaTag(): Plugin {
  const content = cspDirectives
    .filter((directive) => !HEADER_ONLY_CSP_DIRECTIVES.has(directive.split(" ")[0] ?? ""))
    .join("; ");
  return {
    name: "csp-meta-tag",
    apply: "build",
    // Right after <meta charset> (which must stay within the first 1024 bytes) and
    // before any element that loads a resource, since a meta CSP only governs what follows it.
    transformIndexHtml: (html: string): string => {
      const tag = `<meta http-equiv="Content-Security-Policy" content="${content.replace(/"/g, "&quot;")}" />`;
      const anchor = /<meta\s+charset=[^>]*>/i.exec(html) ?? /<head[^>]*>/i.exec(html);
      if (anchor === null) {
        throw new Error("csp-meta-tag: index.html has no <head> to put the CSP in");
      }
      const end = anchor.index + anchor[0].length;
      return `${html.slice(0, end)}\n    ${tag}${html.slice(end)}`;
    },
  };
}

/** Handles a Range request and writes the partial response. Returns false if the header is malformed. */
function serveRangedFile(
  res: ServerResponse,
  filePath: string,
  headers: Record<string, string | number>,
  total: number,
  rangeHeader: string,
): boolean {
  const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
  if (!match) {
    return false;
  }
  const [, startStr, endStr] = match;
  const start = parseInt(startStr ?? "0", 10);
  const end = endStr ? parseInt(endStr, 10) : total - 1;
  res.writeHead(206, {
    ...headers,
    "Content-Range": `bytes ${start}-${end}/${total}`,
    "Content-Length": end - start + 1,
  });
  fs.createReadStream(filePath, { start, end }).pipe(res);
  return true;
}

/**
 * Vite plugin that serves ./videos/ as /videos/ with proper Range-request
 * support (required for video seeking) and copies the directory to dist on build.
 */
function serveVideos(): Plugin {
  return {
    name: "serve-videos",
    configureServer(server: ViteDevServer): void {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/videos/")) {
          return next();
        }

        const filename = decodeURIComponent(req.url.slice("/videos/".length).split("?")[0] ?? "");
        const videosDir = path.resolve("videos");
        const filePath = path.resolve(videosDir, filename);

        // Prevent directory traversal
        if (!filePath.startsWith(videosDir + path.sep)) {
          return next();
        }
        if (!fs.existsSync(filePath)) {
          return next();
        }

        const stat = fs.statSync(filePath);
        const total = stat.size;
        const ext = path.extname(filename).toLowerCase();
        const mimeType = ext === ".webm" ? "video/webm" : "video/mp4";
        const headers: Record<string, string | number> = {
          "Content-Type": mimeType,
          "Accept-Ranges": "bytes",
          "Cross-Origin-Resource-Policy": "same-origin",
        };

        const rangeHeader = req.headers.range;
        if (rangeHeader && serveRangedFile(res as ServerResponse, filePath, headers, total, rangeHeader)) {
          return;
        }

        res.writeHead(200, { ...headers, "Content-Length": total });
        fs.createReadStream(filePath).pipe(res);
      });
    },
    closeBundle(): void {
      const src = path.resolve("videos");
      if (!fs.existsSync(src)) {
        return;
      }
      // cpSync handles subdirectories; the old flat loop did not
      fs.cpSync(src, path.resolve("dist", "videos"), { recursive: true });
    },
  };
}

/**
 * Vite plugin that serves the pre-built OpenCV.js directly from node_modules
 * during development and copies it to dist/ on build.
 *
 * This avoids running the 11 MB Emscripten output through the bundler, which
 * externalises Node-only imports (fs, path, crypto) and produces a
 * content-hashed chunk that breaks across deployments when the browser or
 * service worker caches the old index chunk but the server has new assets.
 */
function serveOpenCV(): Plugin {
  const require = createRequire(import.meta.url);
  const opencvSrc = require.resolve("@techstark/opencv-js");
  return {
    name: "serve-opencv",
    configureServer(server: ViteDevServer): void {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] !== "/opencv.js") {
          return next();
        }
        const stat = fs.statSync(opencvSrc);
        res.writeHead(200, {
          "Content-Type": "application/javascript",
          "Content-Length": stat.size,
          "Cross-Origin-Resource-Policy": "same-origin",
        });
        fs.createReadStream(opencvSrc).pipe(res);
      });
    },
    closeBundle(): void {
      fs.copyFileSync(opencvSrc, path.resolve("dist", "opencv.js"));
    },
  };
}

/** Plugins defined in this file: their warnings are project warnings. */
const OWN_PLUGIN_NAMES: ReadonlySet<string> = new Set([
  "sim-metadata-html",
  "csp-meta-tag",
  "serve-videos",
  "serve-opencv",
]);

/**
 * Turn bundler warnings about project code into build errors. No sim emits any
 * today, so a new one (direct `eval`, an import that resolves to `undefined`, a
 * misplaced `#__PURE__`) is a regression, not noise. Warnings from dependencies
 * stay warnings so an upstream bump cannot break every sim's CI at once.
 */
function onBundlerLog(level: Rolldown.LogLevel, log: Rolldown.RolldownLog, handler: Rolldown.LogOrStringHandler): void {
  const ids = [log.id, ...(log.ids ?? [])].filter((id): id is string => typeof id === "string");
  // A log with no module id but a third-party plugin name (e.g. vite-plugin-pwa) is a dependency's too.
  const fromDependency =
    ids.length > 0
      ? ids.every((id) => id.includes("/node_modules/"))
      : log.plugin !== undefined && !OWN_PLUGIN_NAMES.has(log.plugin);
  if (level === "warn" && !fromDependency) {
    // `handler("error", log)` only reprints under Vite; throwing is what stops the build.
    throw new Error(`${log.message} (fails the build: fleet bundles are warning-free)`);
  }
  handler(level, log);
}

// https://vite.dev/config/
export default defineConfig({
  // So the build can be served from an arbitrary path
  base: "./",
  build: {
    // Fleet browser target. Oxc accepts ES2025 directly.
    target: "es2025",
    // SceneryStack bundles exceed Vite's default 500 kB chunk warning.
    chunkSizeWarningLimit: 5000,
    rolldownOptions: { onLog: onBundlerLog },
  },
  server: {
    headers: securityHeaders,
  },
  preview: {
    headers: securityHeaders,
  },
  plugins: [
    simMetadataHtml(packageJson.description, simConfig.themeColor),
    cspMetaTag(),
    serveVideos(),
    serveOpenCV(),
    VitePWA(
      pwaOptions(simConfig, packageJson, {
        globIgnores: ["opencv.js"],
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin, request }: { url: URL; sameOrigin: boolean; request: Request }) =>
              sameOrigin && request.destination === "script" && url.href === new URL("opencv.js", location.href).href,
            handler: "NetworkFirst",
            options: {
              cacheName: "tracklab-opencv",
              expiration: { maxEntries: 1, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      }),
    ),
  ],
});
