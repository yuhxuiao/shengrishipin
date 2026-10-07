# r04 character-art iteration

## User feedback
On2026-10-07 the user said r03 interaction was more natural and technically improved, but character aesthetics regressed compared with the previous version and had not met the target. This is not approval of r03 appearance.

## Scope
Only web/src/benchmark20/pup.js and wawa.js change. No new timeline, physics, scene, camera, music or story direction.

## Corrections visible in the six-pose preview
- Wawa: vivid blue body and arm, navy tracks, large warm white eyes, cream lower face, defined side window and the earlier birthday-hat identity. The pale gray-blue cab/windshield treatment is removed.
- Pup: deeper and more compact muzzle, less extreme nose offset, connected head/torso silhouette, rectangular warm belly patch, relaxed fingers, small purple party hat. Rounded limb centreline corners remain within the existing IK envelope.
- Background remains quiet and unchanged, making this an artwork comparison rather than a scene redesign.

Preview read and inspected: web/out/benchmark20_r04_art-review.jpg at0.4/1.9/3.9/9.7/12.5/19.2s. This is evidence of the local changes, not a claim of reference-level quality.

## Motion regression
All1201 scene states at60Hz match the r03 motion digest944b9638a151e428a7985a09fb7c830258f746b39b7d69424171dff036618b1c exactly. shots.js, pose.js, dig.js, scene.js and main.js remain byte-identical to r03-motion-baseline.json. Geometry checks pass: planted-foot drift0, knee-bottom857.6976, minimum horizontal bucket/track clearance53.4422. Historical145files unchanged.

## Delivery gate
Use a new r04 directory. Inspect encoded keyframes and matching-time crops before delivery. User acceptance of aesthetics and listening comfort remains pending. Do not enlarge scope to a full feature film, and do not describe numerical checks as artistic approval.
