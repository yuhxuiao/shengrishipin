# r03 sample delivery — 2026-10-06

## Delivered
- output/benchmark20/r03/sample.mp4
- output/benchmark20/r03/sample-silent.mp4
- output/benchmark20/r03/keyposes.jpg
- output/benchmark20/r03/motion-strips/{discover,invite,step,dig,response}.jpg
- output/benchmark20/r03/media-verification.json
- output/benchmark20/r03/ffmpeg-probe.txt
- Local silent preview: web/benchmark20.html (loopback server port 8769).

Build task bsozlfhmb completed with exit code 0. Final render: 600 frames, no page errors. Encoded file measured 20.0s, 1920x1080, 30fps, no unexpected black segments, -16.4 LUFS, true peak -1.8 dBFS. Actual encoded keyposes and step/dig strips were read and inspected.

## Geometry and browser evidence
The user directly ran `node scripts/benchmark20_verify.mjs --browser` and supplied successful stdout: 1201 samples at60Hz, max plant drift0, knee silhouette bottom857.6976, minimum bucket/track horizontal clearance53.4422; preview play/seek/restart and repeated render passed, no browser errors, 145 historical file hashes unchanged.

After that verification, only scene.js toy masking was corrected: clip the toy as well as the mound so its head cannot peek out before excavation. The complete r03 render then succeeded. A final repeated verification with --out was blocked by the tool permission classifier and did not run; therefore no final verification.json from that repeat is claimed. Media verification did run successfully during the build.

## Fixes made during local review
- IK knee outline below ground despite planted feet: adjusted hip/leg configuration and crouch depth, checked the actual stroke radius.
- Waving arm crossed face: revised shoulder/reach geometry.
- Toy close-up included cropped actor fragments: recentered and tightened that shot.
- Bucket load initially appeared all at once: clipped visible load using the shared scoop progress.
- Buried duck cap leaked past curved soil mask: clipped both sides of exposure boundary.

## Acceptance status
Technical export is available for user review; aesthetic/acting and listening comfort are NOT certified. Head yaw currently uses continuous eye/muzzle/ear shape variation rather than a full profile turnaround asset set; it should be judged in the sample, not reported as reference-level acting. Do not expand to the feature without user acceptance. No git commit/push or external publishing. Keep task in_progress while awaiting user review.
