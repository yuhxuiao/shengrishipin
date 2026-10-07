# Benchmark20 Animation Contracts

## 1. Scope / Trigger
Applies only to `web/src/benchmark20/` and `scripts/benchmark20_*`. A 20-second acting sample does not inherit full-feature quotas (30 shots, 6 locations, constant ambient motion). It retains deterministic rendering and collision checks from the V10/V11 specs.

## 2. Signatures
- `B20Shots.evaluateScene(t: number)` returns `{t, shot, camera, wawa, pup}`.
- `window.renderAt(t, mime='image/jpeg', quality=.96)` returns a data URI.
- `window.renderSheet(times, cols=3, width=640)` returns `{url, ms}`.
- `node scripts/benchmark20_verify.mjs [--browser] [--out=relative-path]`.
- `python3 scripts/benchmark20_build.py --revision=rNN --frames=web/out/<fresh-dir>` using the existing media venv.

## 3. Contracts
- Time is finite and clamped to [0,20]; 30fps export contains exactly frames 0..599.
- Repeated, reversed and random-seek evaluations are identical. Draw and tests use the same world geometry.
- `pup.legs[side]` contains hip/knee/foot/sole/planted. Foot contact is not enough: the rendered knee stroke has radius 19.5px and must also clear the ground.
- `wawa.bucketContour` samples every polygon edge; collision checks must not substitute only teeth/pin points.
- Removed soil equals bucket load for this single scoop. No dumping event means no independently growing mound. Duck position is constant and exposure cannot precede soil removal.
- Clip BOTH the visible toy and remaining soil against the same exposure boundary. A curved mound painted over a complete duck can leave its head peeking out even when `exposed=0`.
- Deliberate reaction holds are allowed. Anti-stall checks for mechanical travel must not force actors/background to move continuously.
- All old versions are read-only. Render directories and encoded outputs use fresh revision names.

## 4. Validation / Error Matrix
| Condition | Result |
|---|---|
| Non-finite scene time | TypeError |
| Foot drift >2px while continuously planted | Nonzero assertion failure with time |
| Knee outline below y=867 for ground=865 | Nonzero assertion failure |
| Bucket/track or bucket/actor collision | Nonzero assertion failure |
| Soil removal while teeth outside the soil zone | Nonzero assertion failure |
| Missing frames or not exactly 600 | ValueError before encoding |
| Existing encoded revision | FileExistsError; do not overwrite |
| Failed FFmpeg invocation | Propagated nonzero subprocess error |
| Browser resource error or nondeterministic frame | Nonzero assertion failure |

## 5. Good / Base / Bad Cases
- Good: at 1.9s the feet stay anchored while the body crouches; all leg contours remain above ground.
- Base: a quiet hold with no background motion is valid if the shot has an intentional reading/reaction beat.
- Bad: checking only sole.y passes while an IK knee protrudes below the floor. The first sample exposed this exact defect.
- Bad: a renderer shows a yellow duck cap while exposure metadata says zero. State checks alone cannot detect the layer-mask error.

## 6. Required Tests
Use 1201 samples at 60Hz, plus cut boundaries and repeated/random seek. Verify limb lengths, contact, bucket contour, soil ledger, constant toy position, historical file hashes. Browser checks play/pause/seek/restart, repeated PNG equality and phone-width overflow. Inspect actual encoded keyframes and >=9-frame strips for errors outside the analytic collision model. Media verification reads the encoded file, not presumed render parameters.

Audio uses actual 16-bit PCM WAV headers, local licensed music/SFX, and measured final loudness. Aesthetic quality and listening comfort remain separate user acceptance items; never certify them from module names, source keywords, or global pixel differences.

## 7. Wrong vs Correct
```js
// Wrong: a grounded foot does not imply a grounded leg silhouette.
assert(leg.sole[1] === ground);

// Correct: retain foot invariants and include the actual stroke thickness.
assert(Math.abs(leg.sole[1] - ground) <= 2);
assert(leg.knee[1] + 19.5 <= ground + 2);
```

When shortening an IK chain or lowering the torso, re-evaluate the entire bend path, not just the neutral pose. A pipeline passing technical checks means it can be reviewed, not that it has achieved the desired animation style.
