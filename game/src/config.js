// Island Runway Courier — shared tuning, colours, missions and screenshot presets.
// One job: every number the rest of the game reads lives here, so tuning never
// means hunting through drawing or physics code.
"use strict";

const IRC_CANVAS_WIDTH = 1280;
const IRC_CANVAS_HEIGHT = 800;
const IRC_FOCAL_LENGTH = 720;
const IRC_HORIZON_BASE_Y = 368;
const IRC_PANEL_HEIGHT = 150;
const IRC_COCKPIT_PANEL_HEIGHT = 208;

const IRC_PHYSICS = {
  maxSpeed: 96, // m/s at full throttle (~346 km/h)
  stallSpeed: 38, // m/s — below this the courier sinks
  accel: 14, // m/s^2 towards the throttle target speed
  maxBankDeg: 30,
  bankRate: 55, // deg/s towards the target bank
  pitchRate: 26, // deg/s towards the target pitch
  maxPitchDeg: 18,
  minPitchDeg: -14,
  pitchLevelRate: 6, // deg/s the nose drifts back to level
  fuelBurnIdle: 0.1, // %/s
  fuelBurnFull: 0.34, // %/s at full throttle
  fuelStart: 100,
  damageHardLanding: 34,
};

const IRC_RING_SCORE = 500;
const IRC_RING_RADIUS = 34;

const IRC_MISSIONS = [
  { id: "takeoff", name: "MISSION 1 — TAKEOFF", goal: "Throttle up, lift off and climb past 120 m" },
  { id: "rings", name: "MISSION 2 — RING RUN", goal: "Fly through all 3 golden rings in order" },
  { id: "land", name: "MISSION 3 — COME HOME", goal: "Turn back and land gently on the runway" },
];

const IRC_COLOURS = {
  skyTop: "#5fb2ef",
  skyMid: "#9fd8f7",
  skyHorizon: "#dff3fd",
  seaDeep: "#1668a0",
  seaShallow: "#2f93c8",
  islandGrass: "#5da24a",
  islandGrassDark: "#47853a",
  islandSand: "#e8d9a0",
  fieldA: "#7fb84f",
  fieldB: "#c9b458",
  fieldC: "#4f9e57",
  river: "#4aa3df",
  road: "#8a8f96",
  runway: "#3c4148",
  runwayLine: "#f5f2e4",
  ringGold: "#ffc93c",
  panel: "#12181f",
  panelEdge: "#2c3947",
  gaugeLit: "#7dffb0",
  gaugeWarn: "#ffb347",
  hudText: "#ffffff",
};

// Fixed starting states for the four screenshots (?shot=takeoff|rings|cockpit|landing).
// Each one drops the courier mid-flight in a photogenic moment, already playing,
// so a headless screenshot a couple of seconds in still shows the game at its best.
const IRC_SHOT_PRESETS = {
  takeoff: { x: 0, z: 120, alt: 2, heading: 0, speed: 46, throttle: 0.9, pitch: 6, bank: 0, fuel: 96, view: "chase", mission: "takeoff" },
  rings: { x: 150, z: 700, alt: 170, heading: 20, speed: 72, throttle: 0.75, pitch: 2, bank: 8, fuel: 88, view: "chase", mission: "rings" },
  cockpit: { x: 60, z: 800, alt: 210, heading: 41, speed: 70, throttle: 0.7, pitch: 1, bank: -6, fuel: 84, view: "cockpit", mission: "rings" },
  landing: { x: 30, z: 950, alt: 55, heading: 183, speed: 64, throttle: 0.5, pitch: -3, bank: 0, fuel: 61, view: "chase", mission: "land" },
};
