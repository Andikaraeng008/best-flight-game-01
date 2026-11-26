// Island Runway Courier — game state, physics, missions and the main loop.
// One job: own the frame: read input, move the courier, check rings and landings.
"use strict";

function createCourierState() {
  return {
    x: 0,
    z: 60,
    alt: 0,
    heading: 0,
    speed: 0,
    throttle: 0,
    pitch: 0,
    bank: 0,
    fuel: IRC_PHYSICS.fuelStart,
    damage: 0,
    score: 0,
    missionIndex: 0,
    clearedCount: 0,
    phase: "menu",
    view: "chase",
    grounded: true,
    climbRate: 0,
    time: 0,
    muted: false,
    message: null,
    crashReason: "",
    lookX: 0,
    lookY: 0,
  };
}

function showCourierMessage(state, text, sub, seconds) {
  state.message = { text, sub: sub || "", until: state.time + (seconds || 3) };
}

function applyShotPreset(state, name) {
  const preset = IRC_SHOT_PRESETS[name];
  if (!preset) return false;
  state.x = preset.x;
  state.z = preset.z;
  state.alt = preset.alt;
  state.heading = preset.heading;
  state.speed = preset.speed;
  state.throttle = preset.throttle;
  state.pitch = preset.pitch;
  state.bank = preset.bank;
  state.fuel = preset.fuel;
  state.view = preset.view;
  state.missionIndex = preset.mission === "takeoff" ? 0 : preset.mission === "rings" ? 1 : 2;
  state.clearedCount = preset.mission === "land" ? 3 : 0;
  state.score = state.clearedCount * IRC_RING_SCORE;
  state.grounded = preset.alt <= 2;
  state.phase = "fly";
  state.message = null;
  return true;
}

function resetCourierRun(state) {
  const fresh = createCourierState();
  for (const key of Object.keys(fresh)) state[key] = fresh[key];
  state.phase = "fly";
  showCourierMessage(state, "MISSION 1 — TAKEOFF", "Throttle up with W, lift off past 120 m", 4);
}

function crashCourier(state, audio, reason) {
  state.phase = "crashed";
  state.crashReason = reason;
  state.speed = 0;
  if (audio) audio.crashSound();
}

function pointInRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

function updateCourier(state, world, input, audio, dt) {
  state.time += dt;
  if (state.phase === "menu") {
    if (isKeyDown(input, "Enter") || consumeClick(input)) {
      state.phase = "fly";
      audio.ensure();
      showCourierMessage(state, "MISSION 1 — TAKEOFF", "Throttle up with W, lift off past 120 m", 4);
    }
    return;
  }
  if (state.phase === "landed" || state.phase === "crashed") {
    if (isKeyDown(input, "KeyR") || isKeyDown(input, "Enter") || consumeClick(input)) {
      resetCourierRun(state);
    }
    return;
  }
  const click = consumeClick(input);
  if (click) {
    const buttons = courierButtonRects(state);
    if (pointInRect(click.x, click.y, buttons.thrPlus)) {
      state.throttle = Math.min(1, state.throttle + 0.15);
    } else if (pointInRect(click.x, click.y, buttons.thrMinus)) {
      state.throttle = Math.max(0, state.throttle - 0.15);
    } else if (pointInRect(click.x, click.y, buttons.sound)) {
      state.muted = audio.toggleMute();
    }
  }
  state.throttle = Math.max(0, Math.min(1, state.throttle + throttleKeyInput(input) * 0.6 * dt));
  if (state.fuel <= 0) state.throttle = Math.max(0, state.throttle - dt * 0.5);
  const targetSpeed = state.throttle * IRC_PHYSICS.maxSpeed;
  const accel = IRC_PHYSICS.accel * (state.pitch > 0 ? 0.7 : 1);
  if (state.speed < targetSpeed) state.speed = Math.min(targetSpeed, state.speed + accel * dt);
  else state.speed = Math.max(targetSpeed, state.speed - accel * 1.4 * dt);
  const turn = turnKeyInput(input);
  const targetBank = turn * IRC_PHYSICS.maxBankDeg;
  const bankStep = IRC_PHYSICS.bankRate * dt;
  state.bank += Math.max(-bankStep, Math.min(bankStep, targetBank - state.bank));
  if (state.speed > 5 && !state.grounded) {
    const turnRate =
      ((9.81 * Math.tan((state.bank * Math.PI) / 180)) / Math.max(state.speed, 20)) * 1.6 * (180 / Math.PI);
    state.heading = (state.heading + turnRate * dt + 360) % 360;
  }
  const pitchIn = pitchKeyInput(input);
  const targetPitch = pitchIn > 0 ? IRC_PHYSICS.maxPitchDeg : pitchIn < 0 ? IRC_PHYSICS.minPitchDeg : 0;
  const pitchStep = IRC_PHYSICS.pitchRate * dt;
  if (pitchIn !== 0) {
    state.pitch += Math.max(-pitchStep, Math.min(pitchStep, targetPitch - state.pitch));
  } else {
    const levelStep = IRC_PHYSICS.pitchLevelRate * dt;
    state.pitch += Math.max(-levelStep, Math.min(levelStep, 0 - state.pitch));
  }
  if (state.grounded) {
    state.climbRate = 0;
    if (state.speed > IRC_PHYSICS.stallSpeed + 8 && state.pitch > 4) {
      state.grounded = false;
      showCourierMessage(state, "AIRBORNE!", "", 2);
    }
  } else if (state.speed > IRC_PHYSICS.stallSpeed) {
    state.climbRate = Math.sin((state.pitch * Math.PI) / 180) * state.speed;
    state.alt += state.climbRate * dt;
  } else {
    state.climbRate = -6 - (IRC_PHYSICS.stallSpeed - state.speed) * 0.18;
    state.alt += state.climbRate * dt;
  }
  const headingRad = (state.heading * Math.PI) / 180;
  state.x += Math.sin(headingRad) * state.speed * dt;
  state.z += Math.cos(headingRad) * state.speed * dt;
  state.fuel -=
    (IRC_PHYSICS.fuelBurnIdle + state.throttle * (IRC_PHYSICS.fuelBurnFull - IRC_PHYSICS.fuelBurnIdle)) * dt;
  if (state.fuel < 0) state.fuel = 0;
  if (!state.grounded && state.alt <= 0) {
    state.alt = 0;
    const touchSpeed = state.speed;
    const touchSink = state.climbRate;
    const touchBank = state.bank;
    if (isOverRunway(world, state.x, state.z)) {
      if (Math.abs(touchSink) <= 4.5 && touchSpeed <= 78 && Math.abs(touchBank) <= 12) {
        state.grounded = true;
        state.climbRate = 0;
        if (state.missionIndex === 2) {
          const bonus = Math.max(
            0,
            Math.round(800 - Math.abs(touchSink) * 120 - Math.abs(touchBank) * 8 - Math.max(0, touchSpeed - 55) * 5),
          );
          state.score += bonus;
          state.phase = "landed";
          audio.landingChime();
        } else {
          showCourierMessage(state, "TOUCHDOWN", "Throttle up with W to take off again", 3);
        }
      } else {
        state.damage += IRC_PHYSICS.damageHardLanding;
        if (state.damage >= 100) {
          crashCourier(state, audio, "A hard landing broke the courier apart on the runway.");
        } else {
          state.alt = 3;
          state.climbRate = 3;
          showCourierMessage(state, "HARD LANDING! DAMAGE " + Math.round(state.damage) + "%", "Ease her down next time", 3);
        }
      }
    } else {
      crashCourier(state, audio, "You came down away from the runway — the courier is a write-off.");
    }
  }
  if (state.missionIndex === 0 && state.alt > 120) {
    state.missionIndex = 1;
    showCourierMessage(state, "MISSION 2 — RING RUN", "Thread all 3 golden rings in order", 4);
  }
  if (state.missionIndex === 1) {
    const ring = nextRing(world, state.clearedCount);
    if (ring && distanceToRing(state, ring) < IRC_RING_RADIUS + 8) {
      state.clearedCount += 1;
      state.score += IRC_RING_SCORE;
      audio.ringChime();
      if (state.clearedCount >= world.rings.length) {
        state.missionIndex = 2;
        showCourierMessage(state, "ALL RINGS! +500", "Turn back — land on the runway, heading 180°", 4);
      } else {
        showCourierMessage(state, "RING " + state.clearedCount + " CLEARED! +500", "", 2.5);
      }
    }
  }
  if (input.dragging) {
    state.lookX = Math.max(-140, Math.min(140, input.dragLookX * 0.4));
    state.lookY = Math.max(-70, Math.min(70, input.dragLookY * 0.4));
  } else {
    state.lookX *= 0.9;
    state.lookY *= 0.9;
  }
  for (const cloud of world.clouds) {
    const projected = projectWorldPoint(state, cloud.x, cloud.y, cloud.z);
    if (!projected) {
      cloud.z += 4200;
      cloud.x = state.x + (cloud.x - state.x) * 0.5;
    }
  }
  audio.setEngine(state.throttle, state.speed, !state.grounded);
  if (isKeyDown(input, "KeyR")) resetCourierRun(state);
}

function courierLoop(timestamp, game) {
  requestAnimationFrame((next) => courierLoop(next, game));
  const dt = Math.min(0.05, Math.max(0.001, (timestamp - game.lastTimestamp) / 1000 || 0.016));
  game.lastTimestamp = timestamp;
  updateCourier(game.state, game.world, game.input, game.audio, dt);
  renderGame(game.ctx, game.state, game.world, timestamp);
}

// ?shot=takeoff|rings|cockpit|landing drops the courier straight into a
// photogenic moment with the game already running, so screenshots show a
// flight in progress instead of the menu. Any other value starts at the menu.
function bootCourier() {
  const canvas = document.getElementById("courier-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const world = createIslandWorld();
  const input = createInputState();
  const audio = createCourierAudio();
  const state = createCourierState();
  attachInputListeners(canvas, input, () => audio.ensure());
  const params = new URLSearchParams(window.location.search);
  const shot = params.get("shot");
  if (shot) {
    applyShotPreset(state, shot);
  }
  const game = { ctx, world, input, audio, state, lastTimestamp: 0 };
  // Exposed for local play-testing only (read the live state from a console).
  window.__courier = game;
  requestAnimationFrame((timestamp) => courierLoop(timestamp, game));
}

bootCourier();
