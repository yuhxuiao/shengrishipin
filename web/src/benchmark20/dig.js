// One scoop, authored in world space. Soil and toy exposure follow that scoop.
(function (root) {
  'use strict';
  const M = root.B20Math || require('./pose.js');
  const BUCKET = [[-12,-12],[-34,7],[-53,45],[-56,87],[-38,110],[-5,125],[82,125],[103,105],[49,92],[28,12]];
  const GROUND = 865;
  const PIT = { x: 912, y: GROUND, rx: 142, ry: 35 };
  const DUCK = { x: 874, y: 898, width: 99, height: 102 };
  function evaluate(t) {
    const move = M.phase(t, 6.55, 8.5);
    const x = M.mix(1515, 1370, move);
    const rootPin = [x - 165, 576];
    const reach = M.phase(t, 9.15, 10.25);
    const scrape = M.phase(t, 10.35, 11.65);
    const lift = M.phase(t, 11.8, 13.85);
    let pin = [M.mix(x - 460, 777, reach), M.mix(655, 741, reach)];
    pin = [M.mix(pin[0], 845, scrape), M.mix(pin[1], 750, scrape)];
    pin = [M.mix(pin[0], 933, lift), M.mix(pin[1], 562, lift)];
    const angle = M.mix(0, -0.36, scrape) + M.mix(0, -0.16, lift);
    const elbow = M.joint(rootPin, pin, 270, 250, 1);
    const bucketPolygon = BUCKET.map(p => M.transform(p, pin[0], pin[1], angle));
    const teeth = M.transform([94, 116], pin[0], pin[1], angle);
    const removed = scrape;
    const exposed = scrape * M.phase(t, 12.3, 14.2);
    const focus = M.phase(t, 4.8, 5.3) * (1 - M.phase(t, 18.55, 19.0));
    const nod = 0.055 * Math.sin(Math.PI * M.phase(t, 5.25, 5.8)) + 0.05 * Math.sin(Math.PI * M.phase(t, 18.85, 19.55));
    return {
      x, ground: GROUND, rootPin, pin, elbow, angle, bucketPolygon,
      bucketContour: M.contour(bucketPolygon), teeth, reach, scrape, lift,
      soilRemoved: removed, bucketSoil: removed, exposed,
      trackTravel: x - 1515, trackBox: [x - 242, 754, x + 222, GROUND],
      face: { focus, nod, happy: M.phase(t, 18.55, 19.2), look: focus > 0.5 ? [874, 865] : [570, 540] },
      pit: PIT, duck: DUCK,
      stage: t < 9.15 ? 'approach' : t < 10.35 ? 'reach' : t < 11.8 ? 'scrape' : t < 13.85 ? 'lift' : 'hold',
    };
  }
  const api = { evaluate, BUCKET, GROUND, PIT, DUCK };
  root.B20Dig = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
