/**
 * SWC/dependency-cruiser cannot walk `using` declarations in webcam.ts yet.
 * @type {import("dependency-cruiser").IConfiguration}
 */
module.exports = {
  options: {
    exclude: { path: "^src/webcam\\.ts$" },
  },
};
