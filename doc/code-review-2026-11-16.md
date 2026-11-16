# Code review — TrackLab — 2026-11-16

Reviewed commit: `cebebdeb9c5016837162f76191ba59009947892c`. Working tree was clean at review start.
Selected as one of the ten oldest catalogued simulations by the earliest root commit's author timestamp: `2026-02-17T08:42:09-05:00`. This is source-history age, not GitHub repository-creation age.

## Scope

Track insertion/deletion/retiming and kinematics cache; finite differences; CSV export; calibration transforms; video time synchronization and OpenCV request cancellation paths.

This is a targeted functional code review with broad automated checks, not a full release certification. The findings below describe the reviewed commit. The remediation section records the subsequent corrections.

## Findings

### P2: Differentiate uneven samples at their actual timestamps

Location: `src/track-lab/model/KinematicsComputer.ts:33`.

The interior formula `(nextPosition - previousPosition) / (nextTime - previousTime)` assigns the secant slope to the current sample. For uneven spacing that slope corresponds to another time, even for a noiseless quadratic trajectory. Missing manual samples and point deletion are supported UI paths, so uneven spacing is routine.

For x=t² sampled at times [0,1,3,4,5], the t=1 row reports vx=3 and ax=1.3333333; the exact values are vx=2 and ax=2. This is a 50% velocity error without measurement noise. The same helper is applied again to compute acceleration, compounding the time mismatch.

Recommendation: use a local polynomial fit or nonuniform three-point derivative weights evaluated at each current timestamp. Define endpoint treatment separately, and add quadratic trajectories with missing/deleted frames to the regression suite.

## Validation

Node v26.13.0. `npm run lint`, `npm run check`, `npm run build`, `npm run check:architecture`, and the existing `npm test` suite pass (81 tests). Local Baton compliance passes with warnings; GitHub security settings could not be read by the checker.

Template drift is pre-existing and separate from the functional findings:

```text
❌ TrackLab (3)
   differs       biome.json — differs outside extendable keys
   package       dependencies — dependencies order differs from the template (shared entries first, sim-specific after)
   dependency    @biomejs/biome — @biomejs/biome@^2.6.5 ≠ template ^2.6.6
```

The initial broad unit run overlapped temporary diagnostic-file discovery and removal, producing a missing-file harness error. The complete existing suite was rerun after cleanup and passed (81 tests). This was a review-harness race, not an application failure.

## Reproducer

Temporarily save the following as `tests/review-diagnostic.test.ts`, then run `npm test -- tests/review-diagnostic.test.ts` inside this repository under Node 26. The assertion intentionally fails on the reviewed commit. Remove the temporary test afterward.

```ts
import {it,expect} from "vitest";
import {computeTrackKinematics} from "../src/track-lab/model/KinematicsComputer.js";
it("velocity of x=t² at t=1 with missing frame",()=>{
 const points=[0,1,3,4,5].map(t=>({frame:t,time:t,x:t*t,y:0}));
 const k=computeTrackKinematics({id:"a",symbol:"A",colorIndex:0,points});
 console.log(JSON.stringify(k.points));
 expect(k.points[1]?.vx).toBeCloseTo(2,10);
});
```

## Limits and retained evidence

No new browser fuzz, live video/camera, heap profiling, manual screen-reader audit, remote dependency audit, or educator sign-off was performed in this review. Unit mocks and source tracing do not substitute for these checks. The November 15 fleet-fuzz results in the superproject review log are prior evidence, not a new browser run.

Validation logs and original diagnostic sources/output are retained locally in `/tmp/oldest-review/`; temporary evidence may be removed by the system. This report preserves the actionable reproducers.


## Remediation — 2026-11-16

Finite differences now differentiate a local three-point quadratic at each actual timestamp, including one-sided endpoint stencils; two points retain a secant fallback. Regressions cover missing samples, nonuniform spacing, quadratic motion, endpoints and repeated timestamps.

Permanent regression coverage: `tests/track-lab/model/KinematicsComputer.test.ts`. The historical diagnostic above describes the original failure; use the permanent regression suite to validate the corrected transport path.

Aligned template-owned configuration and shared dependency declarations with SceneryStackTemplate: Biome ^2.6.6, its 2.6.6 schema and locked executable, dependency ordering, and Resonance’s Vitest declaration where applicable. Preserved documented per-simulation configuration exceptions.

Final validation and commit identifiers are recorded in the superproject’s `review-log.md`.
