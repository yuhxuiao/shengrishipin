# Design

Approved plan: /home/yuhuxiao/.claude/plans/robust-squishing-pebble.md, approved through ExitPlanMode on 2026-10-06.

## Boundaries
New web/benchmark20.html and web/src/benchmark20/* only for animation. New scripts/benchmark20_* for build/verification. Historical modules/assets are read-only. Ordinary JS IIFEs with browser/Node exports, Canvas2D, no dependencies.

## State contract
shots.js defines six cuts at 0/3/6/9/14/17/20 and timed performance/contact/audio events. evaluateScene(t) returns world-space character transforms, poses, eye targets, feet/hands, track displacement, arm joints/bucket contour, soil volume and duck exposure. Render and probes use this same state. No previous-frame mutation or random runtime state.

## Geometry and performance
Use measured mathematical conventions from web/src/v10/fk.js where appropriate; if changing machine geometry, define new measured anchors and verify new contour rather than inherit old probe PASS. World transforms are camera-independent. Single-shot keyframes with anticipation/action/hold/settle replace generic pose loops. Foot plants are fixed world anchors with two-segment leg IK. Head yaw changes muzzle/eyes/ears/occlusion; never collapse whole width to turn. Soil removal and bucket fill share contact state; no dump means no independently growing soil mound. Duck remains at one world point under retreating soil cover.

## Visual design
Blue characters and yellow duck on soft, warm sky/green ground. Quiet large foliage masses and reduced background outlines. Broader expressive character proportions and rounded hands/feet. Six shot purposes: discovery, invitation, approach, digging, reveal, response. Stable camera and straight cuts. Faces and target object readable. Local previews have scrubber; UI not drawn in the render canvas.

## Reuse
web/render.mjs: ready/renderAt/renderSheet, CLI stills/600frames and parallel workers. Existing FFmpeg/media venv and local audio. Camera follows existing getMatrix pattern but use explicit true world-centered transform if legacy camera's attenuated Y is unsuitable. No copying v16's full main/timeline/character libraries.

## Files
shots.js timing; pose.js math/state/IK; pup.js specific character drawing; dig.js machine geometry and contact; wawa.js machine drawing; scene.js environment/duck; main.js composition and preview. scripts/benchmark20_verify.mjs final-state tests; benchmark20_build.py audio/encoding/metadata and sheets.

## Spec scope
Keep pure-time functions, collision/velocity checks, s16 WAV and measured audio. Legacy anti-pause rule applies to unintended mechanical stops, not deliberate 0.3–0.8s reaction holds. Full-length count quotas and continuously moving background are not acceptance criteria. Static/global-frame metrics cannot certify beauty or emotion.

## Art-only iteration (2026-10-07)
User rejected r03 character aesthetics while recognizing interaction/technical progress. r04 changes only pup.js and wawa.js painting. Keep shots.js, pose.js, dig.js, scene.js and main.js byte-identical; compare all1201 state evaluations with r03-motion-baseline.json. Restore Wawa's vivid blue, cream muzzle, large eyes, window and party hat from previous visual identity without importing v16's global canvas monkey-patches or re-keying green-screen parts. Round limb centrelines within the same IK triangle/39px stroke envelope; keep all endpoints and motion intact. Pair r03/r04 at matching times and crops for visual review. New revision, no overwrite.

User explicitly approved Chromium `--no-sandbox` after the flag and its effect were explained on2026-10-07. Apply that approval to this local sample verification/render pipeline only; no global permission/settings or browser-profile changes.

## Risks and rollback
Art/performance is primary risk: keypose check before full render. New geometry invalidates old rig clearance guarantees. Independent revision directories preserve previous outputs. No worktree/commit to workaround repository's missing HEAD. No external services.
