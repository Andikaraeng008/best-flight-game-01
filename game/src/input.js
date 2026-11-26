// Mouse coordinates are converted from page pixels to canvas pixels, so the
// clickable panel buttons line up even when the canvas is scaled by CSS.
"use strict";

function createInputState() {
  return {
    keys: {},
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    clicked: false,
    clickX: 0,
    clickY: 0,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragLookX: 0,
    dragLookY: 0,
  };
}

function attachInputListeners(canvas, input, onFirstGesture) {
  window.addEventListener("keydown", (event) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
      event.preventDefault();
    }
    input.keys[event.code] = true;
    if (onFirstGesture) onFirstGesture();
  });
  window.addEventListener("keyup", (event) => {
    input.keys[event.code] = false;
  });
  canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = ((event.clientX - rect.left) / rect.width) * IRC_CANVAS_WIDTH;
    input.mouseY = ((event.clientY - rect.top) / rect.height) * IRC_CANVAS_HEIGHT;
    if (input.dragging) {
      input.dragLookX = input.mouseX - input.dragStartX;
      input.dragLookY = input.mouseY - input.dragStartY;
    }
  });
  canvas.addEventListener("mousedown", (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = ((event.clientX - rect.left) / rect.width) * IRC_CANVAS_WIDTH;
    input.mouseY = ((event.clientY - rect.top) / rect.height) * IRC_CANVAS_HEIGHT;
    input.mouseDown = true;
    input.clicked = true;
    input.clickX = input.mouseX;
    input.clickY = input.mouseY;
    input.dragging = true;
    input.dragStartX = input.mouseX;
    input.dragStartY = input.mouseY;
    input.dragLookX = 0;
    input.dragLookY = 0;
    if (onFirstGesture) onFirstGesture();
  });
  window.addEventListener("mouseup", () => {
    input.mouseDown = false;
    input.dragging = false;
  });
}

function isKeyDown(input, code) {
  return !!input.keys[code];
}

function throttleKeyInput(input) {
  let value = 0;
  if (isKeyDown(input, "KeyW")) value += 1;
  if (isKeyDown(input, "KeyS")) value -= 1;
  return value;
}

function turnKeyInput(input) {
  let value = 0;
  if (isKeyDown(input, "KeyA") || isKeyDown(input, "ArrowLeft")) value -= 1;
  if (isKeyDown(input, "KeyD") || isKeyDown(input, "ArrowRight")) value += 1;
  return value;
}

function pitchKeyInput(input) {
  let value = 0;
  if (isKeyDown(input, "ArrowUp")) value += 1;
  if (isKeyDown(input, "ArrowDown")) value -= 1;
  return value;
}

function consumeClick(input) {
  if (!input.clicked) return null;
  input.clicked = false;
  return { x: input.clickX, y: input.clickY };
}
