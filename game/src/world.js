// Island Runway Courier — the world: islands, fields, river, runway and rings.
// One job: hold the map and turn world coordinates into screen coordinates.
"use strict";

function mulberry32(seed) {
  let a = seed >>> 0;
  return function nextRandom() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createIslandWorld() {
  const rand = mulberry32(20261126);
  const islands = [
    { cx: -40, cz: 950, rx: 980, rz: 1180, kind: "home" },
    { cx: 1350, cz: 1600, rx: 540, rz: 660, kind: "east" },
    { cx: -1250, cz: 2200, rx: 450, rz: 580, kind: "west" },
    { cx: 350, cz: 3250, rx: 620, rz: 430, kind: "north" },
  ];
  const fieldColours = [IRC_COLOURS.fieldA, IRC_COLOURS.fieldB, IRC_COLOURS.fieldC];
  const fields = [];
  for (let i = 0; i < 16; i++) {
    const fx = -750 + rand() * 1500;
    const fz = 250 + rand() * 1700;
    fields.push({
      x: fx,
      z: fz,
      w: 120 + rand() * 180,
      d: 90 + rand() * 150,
      colour: fieldColours[i % fieldColours.length],
    });
  }
  const river = [];
  for (let i = 0; i <= 12; i++) {
    river.push({ x: -620 + i * 95 + Math.sin(i * 1.3) * 70, z: 180 + i * 130 });
  }
  const roads = [
    [
      { x: -500, z: 40 },
      { x: -120, z: 320 },
      { x: 0, z: 620 },
      { x: 60, z: 1100 },
      { x: -80, z: 1700 },
    ],
    [
      { x: -900, z: 900 },
      { x: -300, z: 950 },
      { x: 200, z: 880 },
      { x: 700, z: 1000 },
    ],
  ];
  const trees = [];
  for (let i = 0; i < 90; i++) {
    trees.push({ x: -850 + rand() * 1700, z: 150 + rand() * 1900 });
  }
  const clouds = [];
  for (let i = 0; i < 12; i++) {
    clouds.push({
      x: -1400 + rand() * 2800,
      z: 300 + rand() * 2600,
      y: 380 + rand() * 260,
      size: 90 + rand() * 130,
    });
  }
  const rings = [
    { x: 280, y: 165, z: 1050, label: "RING 1" },
    { x: -320, y: 210, z: 1750, label: "RING 2" },
    { x: 120, y: 190, z: 2450, label: "RING 3" },
  ];
  const runway = { x: 0, zStart: 0, zEnd: 600, halfWidth: 13 };
  return { islands, fields, river, roads, trees, clouds, rings, runway };
}

// Perspective projection for a chase camera sitting just above the courier.
// The camera looks along the heading; forward is distance ahead, lateral is
// distance to the right, and height above the ground lifts a point off the
// horizon. Returns null when the point is behind the camera.
function projectWorldPoint(camera, wx, wy, wz) {
  const dx = wx - camera.x;
  const dz = wz - camera.z;
  const headingRad = (camera.heading * Math.PI) / 180;
  const sinH = Math.sin(headingRad);
  const cosH = Math.cos(headingRad);
  const forward = dx * sinH + dz * cosH;
  if (forward < 8) return null;
  const lateral = dx * cosH - dz * sinH;
  const scale = IRC_FOCAL_LENGTH / forward;
  const camHeight = camera.alt + 2.5;
  const horizonY = IRC_HORIZON_BASE_Y + camera.pitch * 5 + camera.lookY;
  const cx = IRC_CANVAS_WIDTH / 2;
  let sx = cx + lateral * scale + camera.lookX;
  let sy = horizonY + (camHeight - wy) * scale;
  const roll = ((-camera.bank * Math.PI) / 180) * 0.6;
  const cosR = Math.cos(roll);
  const sinR = Math.sin(roll);
  const rx = sx - cx;
  const ry = sy - horizonY;
  sx = cx + rx * cosR - ry * sinR;
  sy = horizonY + rx * sinR + ry * cosR;
  return { x: sx, y: sy, scale, forward };
}

function ellipseOutlinePoints(cx, cz, rx, rz, count) {
  const points = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    points.push({ x: cx + Math.cos(a) * rx, z: cz + Math.sin(a) * rz });
  }
  return points;
}

function isOverRunway(world, x, z) {
  const r = world.runway;
  return Math.abs(x - r.x) <= r.halfWidth + 3 && z >= r.zStart - 20 && z <= r.zEnd + 20;
}

function distanceToRing(state, ring) {
  const dx = ring.x - state.x;
  const dy = ring.y - state.alt;
  const dz = ring.z - state.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function nextRing(world, clearedCount) {
  return clearedCount < world.rings.length ? world.rings[clearedCount] : null;
}
