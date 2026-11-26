// Island Runway Courier — every pixel: sky, terrain, runway, rings, plane,
// cockpit instruments and HUD.
// One job: draw the current state; it never changes the state.
"use strict";

function courierRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function courierText(ctx, text, x, y, size, colour, align, weight) {
  ctx.font = (weight || "700") + " " + size + "px system-ui, sans-serif";
  ctx.fillStyle = colour;
  ctx.textAlign = align || "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

function courierPanelTop(state) {
  return IRC_CANVAS_HEIGHT - (state.view === "cockpit" ? IRC_COCKPIT_PANEL_HEIGHT : IRC_PANEL_HEIGHT);
}

function courierHorizonY(state) {
  return IRC_HORIZON_BASE_Y + state.pitch * 5 + state.lookY;
}

function courierButtonRects(state) {
  const panelTop = courierPanelTop(state);
  const big = state.view === "cockpit";
  const cy = panelTop + (big ? 108 : 78);
  return {
    thrPlus: { x: 1010, y: cy - 44, w: 96, h: 34 },
    thrMinus: { x: 1010, y: cy - 2, w: 96, h: 34 },
    sound: { x: 1010, y: cy + 40, w: 96, h: 30 },
  };
}

function drawCourierSky(ctx, state, timeMs) {
  const horizonY = courierHorizonY(state);
  const sky = ctx.createLinearGradient(0, 0, 0, Math.max(horizonY, 1));
  sky.addColorStop(0, IRC_COLOURS.skyTop);
  sky.addColorStop(0.65, IRC_COLOURS.skyMid);
  sky.addColorStop(1, IRC_COLOURS.skyHorizon);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, IRC_CANVAS_WIDTH, Math.max(horizonY, 0));
  const sunX = 1060;
  const sunY = 108;
  const halo = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 130);
  halo.addColorStop(0, "rgba(255, 244, 200, 0.95)");
  halo.addColorStop(0.35, "rgba(255, 226, 140, 0.45)");
  halo.addColorStop(1, "rgba(255, 226, 140, 0)");
  ctx.fillStyle = halo;
  ctx.fillRect(sunX - 140, sunY - 140, 280, 280);
  ctx.fillStyle = "#fff3c4";
  ctx.beginPath();
  ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
  for (let i = 0; i < 5; i++) {
    const cx = ((i * 263 + timeMs * 0.004) % 1400) - 60;
    const cy = 52 + i * 34;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 74, 13, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 44, cy + 5, 52, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCourierSeaAndIslands(ctx, state, world) {
  const horizonY = courierHorizonY(state);
  const panelTop = courierPanelTop(state);
  const sea = ctx.createLinearGradient(0, horizonY, 0, panelTop);
  sea.addColorStop(0, IRC_COLOURS.seaShallow);
  sea.addColorStop(1, IRC_COLOURS.seaDeep);
  ctx.fillStyle = sea;
  ctx.fillRect(0, horizonY, IRC_CANVAS_WIDTH, panelTop - horizonY);
  for (const island of world.islands) {
    const rim = ellipseOutlinePoints(island.cx, island.cz, island.rx, island.rz, 26);
    const rimScreen = rim.map((p) => projectWorldPoint(state, p.x, 0, p.z)).filter(Boolean);
    if (rimScreen.length < 4) continue;
    ctx.beginPath();
    ctx.moveTo(rimScreen[0].x, rimScreen[0].y);
    for (const p of rimScreen) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fillStyle = IRC_COLOURS.islandSand;
    ctx.fill();
    const inner = ellipseOutlinePoints(island.cx, island.cz, island.rx * 0.93, island.rz * 0.92, 26);
    const innerScreen = inner.map((p) => projectWorldPoint(state, p.x, 0, p.z)).filter(Boolean);
    if (innerScreen.length < 4) continue;
    ctx.beginPath();
    ctx.moveTo(innerScreen[0].x, innerScreen[0].y);
    for (const p of innerScreen) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fillStyle = island.kind === "home" ? IRC_COLOURS.islandGrass : IRC_COLOURS.islandGrassDark;
    ctx.fill();
  }
  for (const field of world.fields) {
    const corners = [
      { x: field.x, z: field.z },
      { x: field.x + field.w, z: field.z },
      { x: field.x + field.w, z: field.z + field.d },
      { x: field.x, z: field.z + field.d },
    ].map((p) => projectWorldPoint(state, p.x, 0, p.z));
    if (corners.some((p) => !p)) continue;
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (const p of corners) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fillStyle = field.colour;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  const riverScreen = world.river.map((p) => projectWorldPoint(state, p.x, 0, p.z));
  ctx.strokeStyle = IRC_COLOURS.river;
  ctx.lineWidth = 7;
  ctx.lineJoin = "round";
  ctx.beginPath();
  let started = false;
  for (const p of riverScreen) {
    if (!p) {
      started = false;
      continue;
    }
    if (!started) {
      ctx.moveTo(p.x, p.y);
      started = true;
    } else {
      ctx.lineTo(p.x, p.y);
    }
  }
  ctx.stroke();
  ctx.strokeStyle = IRC_COLOURS.road;
  ctx.lineWidth = 4;
  for (const road of world.roads) {
    ctx.beginPath();
    let startedRoad = false;
    for (const p of road) {
      const s = projectWorldPoint(state, p.x, 0, p.z);
      if (!s) {
        startedRoad = false;
        continue;
      }
      if (!startedRoad) {
        ctx.moveTo(s.x, s.y);
        startedRoad = true;
      } else {
        ctx.lineTo(s.x, s.y);
      }
    }
    ctx.stroke();
  }
  ctx.fillStyle = "#2e6b2f";
  for (const tree of world.trees) {
    const s = projectWorldPoint(state, tree.x, 0, tree.z);
    if (!s || s.forward > 2600) continue;
    ctx.beginPath();
    ctx.arc(s.x, s.y, Math.max(1.5, 4 * s.scale), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCourierRunway(ctx, state, world) {
  const r = world.runway;
  ctx.fillStyle = IRC_COLOURS.runway;
  let prevL = null;
  let prevR = null;
  for (let z = r.zStart; z <= r.zEnd; z += 25) {
    const l = projectWorldPoint(state, r.x - r.halfWidth, 0, z);
    const rr = projectWorldPoint(state, r.x + r.halfWidth, 0, z);
    if (l && rr && prevL && prevR) {
      ctx.beginPath();
      ctx.moveTo(prevL.x, prevL.y);
      ctx.lineTo(prevR.x, prevR.y);
      ctx.lineTo(rr.x, rr.y);
      ctx.lineTo(l.x, l.y);
      ctx.closePath();
      ctx.fill();
    }
    prevL = l;
    prevR = rr;
  }
  ctx.fillStyle = IRC_COLOURS.runwayLine;
  for (let z = r.zStart + 20; z < r.zEnd - 10; z += 44) {
    const a = projectWorldPoint(state, r.x - 1, 0, z);
    const b = projectWorldPoint(state, r.x + 1, 0, z);
    const c = projectWorldPoint(state, r.x + 1, 0, z + 20);
    const d = projectWorldPoint(state, r.x - 1, 0, z + 20);
    if (!a || !b || !c || !d) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
  }
  for (const tz of [r.zStart + 8, r.zEnd - 26]) {
    for (let k = -2; k <= 2; k++) {
      if (k === 0) continue;
      const a = projectWorldPoint(state, r.x + k * 4 - 1.4, 0, tz);
      const b = projectWorldPoint(state, r.x + k * 4 + 1.4, 0, tz);
      const c = projectWorldPoint(state, r.x + k * 4 + 1.4, 0, tz + 16);
      const d = projectWorldPoint(state, r.x + k * 4 - 1.4, 0, tz + 16);
      if (!a || !b || !c || !d) continue;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.closePath();
      ctx.fill();
    }
  }
  for (let z = r.zStart + 10; z <= r.zEnd; z += 60) {
    for (const side of [-1, 1]) {
      const s = projectWorldPoint(state, r.x + side * (r.halfWidth + 2), 0, z);
      if (!s) continue;
      ctx.fillStyle = "rgba(255, 190, 80, 0.35)";
      ctx.beginPath();
      ctx.arc(s.x, s.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd27a";
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const base = projectWorldPoint(state, r.x + 26, 0, 60);
  const top = projectWorldPoint(state, r.x + 26, 9, 60);
  if (base && top) {
    ctx.strokeStyle = "#dfe6ea";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(top.x, top.y);
    ctx.stroke();
    ctx.fillStyle = "#ff7a3c";
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(top.x + 16, top.y + 3);
    ctx.lineTo(top.x, top.y + 7);
    ctx.closePath();
    ctx.fill();
  }
}

function drawCourierRings(ctx, state, world, timeMs) {
  world.rings.forEach((ring, index) => {
    const centre = projectWorldPoint(state, ring.x, ring.y, ring.z);
    if (!centre || centre.forward > 3200) return;
    const radiusPx = Math.max(6, IRC_RING_RADIUS * centre.scale);
    const cleared = index < state.clearedCount;
    const isNext = index === state.clearedCount && state.missionIndex === 1;
    ctx.save();
    ctx.globalAlpha = cleared ? 0.55 : isNext ? 1 : 0.8;
    const colour = cleared ? "#7dffb0" : IRC_COLOURS.ringGold;
    ctx.strokeStyle = colour;
    ctx.lineWidth = Math.max(3, radiusPx * 0.14) + (isNext ? Math.sin(timeMs / 240) * 2 : 0);
    ctx.shadowColor = colour;
    ctx.shadowBlur = isNext ? 26 : 12;
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, radiusPx, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = cleared ? "rgba(125, 255, 176, 0.14)" : "rgba(255, 201, 60, 0.10)";
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, radiusPx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (isNext) {
      const dist = Math.round(distanceToRing(state, ring));
      courierText(ctx, ring.label + "  —  " + dist + " m", centre.x, centre.y - radiusPx - 18, 17, "#ffffff", "center", "800");
      courierText(ctx, "▼", centre.x, centre.y + radiusPx + 16, 15, IRC_COLOURS.ringGold, "center", "800");
    }
  });
}

function drawCourierClouds(ctx, state, world) {
  for (const cloud of world.clouds) {
    const s = projectWorldPoint(state, cloud.x, cloud.y, cloud.z);
    if (!s || s.forward > 3400) continue;
    const w = cloud.size * s.scale;
    if (w < 4) continue;
    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, w, w * 0.32, 0, 0, Math.PI * 2);
    ctx.ellipse(s.x - w * 0.5, s.y + w * 0.08, w * 0.6, w * 0.24, 0, 0, Math.PI * 2);
    ctx.ellipse(s.x + w * 0.5, s.y + w * 0.08, w * 0.6, w * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCourierPlaneShadow(ctx, state) {
  if (state.alt > 70) return;
  // On the runway the shadow sits right under the courier; in the air it
  // shrinks and fades as the plane climbs away from the ground.
  const strength = state.alt <= 1 ? 0.4 : 0.4 * (1 - state.alt / 70);
  const px = IRC_CANVAS_WIDTH / 2 + state.lookX;
  const panelTop = courierPanelTop(state);
  const py = Math.min(panelTop - 8 - state.alt * 0.4, panelTop - 6);
  const w = Math.max(24, 120 - state.alt * 0.9);
  ctx.fillStyle = "rgba(20, 30, 20, " + strength.toFixed(2) + ")";
  ctx.beginPath();
  ctx.ellipse(px, py, w, Math.max(6, w * 0.16), 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCourierPlane(ctx, state, timeMs) {
  const scale = state.view === "cockpit" ? 0.7 : 1;
  const px = IRC_CANVAS_WIDTH / 2 + state.lookX;
  const py = (state.view === "cockpit" ? 560 : 548) + state.lookY - state.pitch * 1.2 + Math.sin(timeMs / 500) * 1.5;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate((state.bank * Math.PI) / 180);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#f4f6f7";
  ctx.beginPath();
  ctx.moveTo(-118, -6);
  ctx.lineTo(-16, -22);
  ctx.lineTo(-10, 4);
  ctx.lineTo(-118, 16);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(118, -6);
  ctx.lineTo(16, -22);
  ctx.lineTo(10, 4);
  ctx.lineTo(118, 16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#e8543f";
  ctx.beginPath();
  ctx.moveTo(-118, -6);
  ctx.lineTo(-104, -9);
  ctx.lineTo(-104, 13);
  ctx.lineTo(-118, 16);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(118, -6);
  ctx.lineTo(104, -9);
  ctx.lineTo(104, 13);
  ctx.lineTo(118, 16);
  ctx.closePath();
  ctx.fill();
  const blink = Math.floor(timeMs / 450) % 2 === 0;
  if (blink) {
    ctx.fillStyle = "#ff3b30";
    ctx.beginPath();
    ctx.arc(-120, 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#37d67a";
    ctx.beginPath();
    ctx.arc(120, 4, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  const body = ctx.createLinearGradient(0, 46, 0, -84);
  body.addColorStop(0, "#d94a35");
  body.addColorStop(0.55, "#e8543f");
  body.addColorStop(1, "#f2705a");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-24, 46);
  ctx.quadraticCurveTo(-26, -10, -13, -82);
  ctx.quadraticCurveTo(0, -90, 13, -82);
  ctx.quadraticCurveTo(26, -10, 24, 46);
  ctx.quadraticCurveTo(0, 54, -24, 46);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fdfdfd";
  ctx.beginPath();
  ctx.moveTo(-22, 30);
  ctx.lineTo(-18, -58);
  ctx.lineTo(-11, -58);
  ctx.lineTo(-15, 30);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(22, 30);
  ctx.lineTo(18, -58);
  ctx.lineTo(11, -58);
  ctx.lineTo(15, 30);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#16324a";
  ctx.beginPath();
  ctx.moveTo(-10, -62);
  ctx.lineTo(10, -62);
  ctx.lineTo(8, -76);
  ctx.lineTo(-8, -76);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#e8543f";
  ctx.beginPath();
  ctx.moveTo(-9, 40);
  ctx.lineTo(-13, 74);
  ctx.lineTo(13, 74);
  ctx.lineTo(9, 40);
  ctx.closePath();
  ctx.fill();
  courierText(ctx, "7", 0, 58, 20, "#ffffff", "center", "800");
  ctx.fillStyle = "#f4f6f7";
  ctx.beginPath();
  ctx.moveTo(-58, 34);
  ctx.lineTo(-12, 28);
  ctx.lineTo(-10, 40);
  ctx.lineTo(-58, 46);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(58, 34);
  ctx.lineTo(12, 28);
  ctx.lineTo(10, 40);
  ctx.lineTo(58, 46);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawArtificialHorizon(ctx, cx, cy, r, state) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate((-state.bank * Math.PI) / 180);
  const pitchPx = state.pitch * 1.6;
  ctx.fillStyle = "#3f8fd2";
  ctx.fillRect(-r - 4, -r - 4, r * 2 + 8, r + 4 + pitchPx);
  ctx.fillStyle = "#8a5a33";
  ctx.fillRect(-r - 4, pitchPx, r * 2 + 8, r + 4 - pitchPx);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-r - 4, pitchPx - 1, r * 2 + 8, 2);
  ctx.restore();
  ctx.strokeStyle = "#ffd94a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.55, cy);
  ctx.lineTo(cx - r * 0.18, cy);
  ctx.moveTo(cx + r * 0.18, cy);
  ctx.lineTo(cx + r * 0.55, cy);
  ctx.moveTo(cx, cy - 5);
  ctx.lineTo(cx, cy + 5);
  ctx.stroke();
  ctx.strokeStyle = "#31414f";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(125, 255, 176, 0.8)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
  ctx.stroke();
  courierText(ctx, "ATT", cx, cy + r + 16, 12, "#9fb2c1", "center", "700");
}

function drawRoundGauge(ctx, cx, cy, r, label, valueText, frac, accent) {
  ctx.fillStyle = "#0a0f14";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#31414f";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(125, 255, 176, 0.7)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i <= 10; i++) {
    const a = (-210 + i * 24) * (Math.PI / 180);
    const x1 = cx + Math.cos(a) * (r - 8);
    const y1 = cy + Math.sin(a) * (r - 8);
    const x2 = cx + Math.cos(a) * (r - 15);
    const y2 = cy + Math.sin(a) * (r - 15);
    ctx.strokeStyle = "#c7d3dc";
    ctx.lineWidth = i % 5 === 0 ? 2.5 : 1.2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  const angle = (-210 + Math.max(0, Math.min(1, frac)) * 240) * (Math.PI / 180);
  ctx.strokeStyle = accent || IRC_COLOURS.gaugeLit;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(angle) * (r - 18), cy + Math.sin(angle) * (r - 18));
  ctx.stroke();
  ctx.fillStyle = accent || IRC_COLOURS.gaugeLit;
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  courierText(ctx, valueText, cx, cy + r * 0.42, 15, "#ffffff", "center", "800");
  courierText(ctx, label, cx, cy + r + 16, 12, "#9fb2c1", "center", "700");
}

function drawCompassTape(ctx, cx, cy, w, h, state) {
  courierRoundRect(ctx, cx - w / 2, cy - h / 2, w, h, 10);
  ctx.fillStyle = "#0a0f14";
  ctx.fill();
  ctx.strokeStyle = "#31414f";
  ctx.lineWidth = 2;
  ctx.stroke();
  const heading = ((state.heading % 360) + 360) % 360;
  const pxPerDeg = w / 120;
  ctx.save();
  courierRoundRect(ctx, cx - w / 2, cy - h / 2, w, h, 10);
  ctx.clip();
  const startDeg = Math.floor((heading - 60) / 5) * 5;
  for (let deg = startDeg; deg <= heading + 60; deg += 5) {
    const norm = ((deg % 360) + 360) % 360;
    const x = cx + (deg - heading) * pxPerDeg;
    const major = norm % 30 === 0;
    ctx.strokeStyle = "#c7d3dc";
    ctx.lineWidth = major ? 2.5 : 1;
    ctx.beginPath();
    ctx.moveTo(x, cy - h / 2 + 8);
    ctx.lineTo(x, cy - h / 2 + (major ? 22 : 15));
    ctx.stroke();
    if (major) {
      const names = { 0: "N", 45: "NE", 90: "E", 135: "SE", 180: "S", 225: "SW", 270: "W", 315: "NW" };
      courierText(ctx, names[norm] || String(norm), x, cy + 14, 13, "#ffffff", "center", "800");
    }
  }
  ctx.restore();
  ctx.fillStyle = IRC_COLOURS.gaugeWarn;
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy - h / 2);
  ctx.lineTo(cx + 8, cy - h / 2);
  ctx.lineTo(cx, cy - h / 2 + 12);
  ctx.closePath();
  ctx.fill();
  courierText(ctx, "HDG " + String(Math.round(heading)).padStart(3, "0") + "°", cx, cy + h / 2 + 16, 13, "#9fb2c1", "center", "700");
}

function drawPanelButton(ctx, x, y, w, h, label) {
  courierRoundRect(ctx, x, y, w, h, 7);
  ctx.fillStyle = "#1e2a35";
  ctx.fill();
  ctx.strokeStyle = "#3d4f5f";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  courierText(ctx, label, x + w / 2, y + h / 2 + 1, 14, "#e8f1f6", "center", "700");
}

function drawInstrumentPanel(ctx, state) {
  const panelTop = courierPanelTop(state);
  const big = state.view === "cockpit";
  const panel = ctx.createLinearGradient(0, panelTop, 0, IRC_CANVAS_HEIGHT);
  panel.addColorStop(0, "#1a232c");
  panel.addColorStop(1, "#0c1116");
  ctx.fillStyle = panel;
  ctx.fillRect(0, panelTop, IRC_CANVAS_WIDTH, IRC_CANVAS_HEIGHT - panelTop);
  ctx.fillStyle = IRC_COLOURS.gaugeLit;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(0, panelTop, IRC_CANVAS_WIDTH, 2);
  ctx.globalAlpha = 1;
  const cy = panelTop + (big ? 108 : 78);
  const r = big ? 62 : 50;
  drawArtificialHorizon(ctx, 118, cy, r, state);
  drawRoundGauge(ctx, 258, cy, r - 2, "ALT m", String(Math.round(state.alt)), Math.min(1, state.alt / 400), IRC_COLOURS.gaugeLit);
  drawRoundGauge(ctx, 388, cy, r - 2, "SPD km/h", String(Math.round(state.speed * 3.6)), Math.min(1, state.speed / IRC_PHYSICS.maxSpeed), "#7dc8ff");
  drawCompassTape(ctx, 640, cy, 300, 66, state);
  const fuelX = 856;
  const fuelY = cy - 44;
  const fuelW = 26;
  const fuelH = 88;
  courierRoundRect(ctx, fuelX, fuelY, fuelW, fuelH, 6);
  ctx.fillStyle = "#0a0f14";
  ctx.fill();
  const fuelFrac = state.fuel / 100;
  ctx.fillStyle = fuelFrac > 0.25 ? IRC_COLOURS.gaugeLit : IRC_COLOURS.gaugeWarn;
  const fh = fuelH * fuelFrac;
  courierRoundRect(ctx, fuelX + 3, fuelY + fuelH - fh + 3, fuelW - 6, Math.max(0, fh - 6), 4);
  ctx.fill();
  courierText(ctx, "FUEL", fuelX + fuelW / 2, fuelY + fuelH + 16, 12, "#9fb2c1", "center", "700");
  courierText(ctx, Math.round(state.fuel) + "%", fuelX + fuelW / 2, fuelY - 14, 13, "#ffffff", "center", "800");
  const thrX = 930;
  const thrY = cy - 44;
  const thrH = 88;
  ctx.strokeStyle = "#31414f";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(thrX, thrY);
  ctx.lineTo(thrX, thrY + thrH);
  ctx.stroke();
  const leverY = thrY + thrH - state.throttle * thrH;
  ctx.fillStyle = "#ffb347";
  courierRoundRect(ctx, thrX - 14, leverY - 6, 28, 12, 4);
  ctx.fill();
  courierText(ctx, "THR", thrX, thrY + thrH + 16, 12, "#9fb2c1", "center", "700");
  courierText(ctx, Math.round(state.throttle * 100) + "%", thrX, thrY - 14, 13, "#ffffff", "center", "800");
  const buttons = courierButtonRects(state);
  drawPanelButton(ctx, buttons.thrPlus.x, buttons.thrPlus.y, buttons.thrPlus.w, buttons.thrPlus.h, "THR +");
  drawPanelButton(ctx, buttons.thrMinus.x, buttons.thrMinus.y, buttons.thrMinus.w, buttons.thrMinus.h, "THR -");
  drawPanelButton(ctx, buttons.sound.x, buttons.sound.y, buttons.sound.w, buttons.sound.h, state.muted ? "SOUND OFF" : "SOUND ON");
  if (state.damage > 0) {
    courierText(ctx, "DAMAGE " + Math.round(state.damage) + "%", 1130, cy - 20, 15, "#ffb347", "left", "800");
  }
  courierText(ctx, "GEAR DOWN", 1130, cy + 8, 13, "#7dffb0", "left", "700");
  courierText(ctx, "FLAPS 10°", 1130, cy + 30, 13, "#9fb2c1", "left", "700");
}

function drawCourierHud(ctx, state, world) {
  ctx.fillStyle = "rgba(8, 14, 20, 0.62)";
  ctx.fillRect(0, 0, IRC_CANVAS_WIDTH, 56);
  courierText(ctx, "ISLAND RUNWAY COURIER", 22, 20, 19, "#ffffff", "left", "800");
  const mission = IRC_MISSIONS[state.missionIndex];
  courierText(ctx, mission.name, 22, 42, 13, "#ffd27a", "left", "700");
  courierText(ctx, mission.goal, 330, 42, 13, "#c7d3dc", "left", "400");
  courierText(ctx, "SCORE  " + state.score, 1258, 20, 18, "#ffffff", "right", "800");
  courierText(ctx, "RINGS  " + state.clearedCount + " / 3", 1258, 42, 13, "#7dffb0", "right", "700");
  const boxes = [
    { label: "ALTITUDE", value: Math.round(state.alt) + " m", x: 22 },
    { label: "SPEED", value: Math.round(state.speed * 3.6) + " km/h", x: 196 },
    { label: "HEADING", value: String(Math.round(((state.heading % 360) + 360) % 360)).padStart(3, "0") + "°", x: 370 },
  ];
  for (const box of boxes) {
    ctx.fillStyle = "rgba(8, 14, 20, 0.62)";
    courierRoundRect(ctx, box.x, 68, 160, 58, 9);
    ctx.fill();
    ctx.strokeStyle = "rgba(125, 255, 176, 0.55)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    courierText(ctx, box.label, box.x + 12, 84, 11, "#9fb2c1", "left", "700");
    courierText(ctx, box.value, box.x + 12, 108, 21, "#ffffff", "left", "800");
  }
  const target = state.missionIndex === 1 ? nextRing(world, state.clearedCount) : null;
  if (target) {
    courierText(ctx, "NEXT: " + target.label + " — " + Math.round(distanceToRing(state, target)) + " m", 560, 100, 15, "#ffd27a", "left", "800");
  } else if (state.missionIndex === 2) {
    const dx = 0 - state.x;
    const dz = 300 - state.z;
    courierText(ctx, "NEXT: RUNWAY — " + Math.round(Math.hypot(dx, dz)) + " m · land heading 180°", 560, 100, 15, "#ffd27a", "left", "800");
  }
  if (state.fuel < 20 && state.phase === "fly") {
    courierText(ctx, "LOW FUEL — " + Math.round(state.fuel) + "%", 1258, 100, 16, "#ffb347", "right", "800");
  }
}

function drawCourierMessage(ctx, state) {
  if (!state.message || state.time > state.message.until) return;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 12;
  courierText(ctx, state.message.text, IRC_CANVAS_WIDTH / 2, 190, 34, "#ffffff", "center", "800");
  ctx.restore();
  if (state.message.sub) {
    courierText(ctx, state.message.sub, IRC_CANVAS_WIDTH / 2, 226, 16, "#ffd27a", "center", "700");
  }
}

function drawCourierOverlay(ctx, state) {
  if (state.phase === "fly") return;
  ctx.fillStyle = "rgba(6, 10, 14, 0.55)";
  ctx.fillRect(0, 0, IRC_CANVAS_WIDTH, IRC_CANVAS_HEIGHT);
  const boxW = 640;
  const boxH = state.phase === "menu" ? 330 : 280;
  const bx = (IRC_CANVAS_WIDTH - boxW) / 2;
  const by = (IRC_CANVAS_HEIGHT - boxH) / 2 - 40;
  ctx.fillStyle = "rgba(10, 17, 23, 0.92)";
  courierRoundRect(ctx, bx, by, boxW, boxH, 16);
  ctx.fill();
  ctx.strokeStyle = "rgba(125, 255, 176, 0.6)";
  ctx.lineWidth = 2;
  ctx.stroke();
  if (state.phase === "menu") {
    courierText(ctx, "ISLAND RUNWAY COURIER", 640, by + 52, 34, "#ffffff", "center", "800");
    courierText(ctx, "Fly the mail plane between the islands: take off,", 640, by + 104, 16, "#c7d3dc", "center", "400");
    courierText(ctx, "thread all 3 golden rings, then bring her home.", 640, by + 128, 16, "#c7d3dc", "center", "400");
    courierText(ctx, "W / S — throttle      A / D — turn      ↑ / ↓ — pitch", 640, by + 176, 16, "#ffd27a", "center", "700");
    courierText(ctx, "Drag the mouse to look around · click THR + / − on the panel", 640, by + 202, 14, "#9fb2c1", "center", "400");
    courierText(ctx, "Press ENTER or click to fly", 640, by + 258, 20, "#7dffb0", "center", "800");
  } else if (state.phase === "landed") {
    courierText(ctx, "DELIVERED — WELCOME HOME!", 640, by + 52, 30, "#7dffb0", "center", "800");
    courierText(ctx, "All 3 rings threaded and a smooth touchdown.", 640, by + 96, 16, "#c7d3dc", "center", "400");
    courierText(ctx, "SCORE  " + state.score + "  ·  FUEL LEFT  " + Math.round(state.fuel) + "%", 640, by + 140, 18, "#ffffff", "center", "800");
    courierText(ctx, "Press R to fly again", 640, by + 196, 18, "#ffd27a", "center", "700");
  } else if (state.phase === "crashed") {
    courierText(ctx, "CRASHED", 640, by + 52, 34, "#ff6b5e", "center", "800");
    courierText(ctx, state.crashReason || "The courier is down.", 640, by + 100, 16, "#c7d3dc", "center", "400");
    courierText(ctx, "SCORE  " + state.score, 640, by + 140, 18, "#ffffff", "center", "800");
    courierText(ctx, "Press R to try again", 640, by + 196, 18, "#ffd27a", "center", "700");
  }
}

function renderGame(ctx, state, world, timeMs) {
  ctx.clearRect(0, 0, IRC_CANVAS_WIDTH, IRC_CANVAS_HEIGHT);
  drawCourierSky(ctx, state, timeMs);
  drawCourierSeaAndIslands(ctx, state, world);
  drawCourierRunway(ctx, state, world);
  drawCourierRings(ctx, state, world, timeMs);
  drawCourierClouds(ctx, state, world);
  drawCourierPlaneShadow(ctx, state);
  drawCourierPlane(ctx, state, timeMs);
  drawInstrumentPanel(ctx, state);
  drawCourierHud(ctx, state, world);
  drawCourierMessage(ctx, state);
  drawCourierOverlay(ctx, state);
}
