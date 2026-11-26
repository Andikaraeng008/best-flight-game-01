// The engine hum is two detuned oscillators through a low-pass filter; its
// pitch and loudness follow throttle and speed, so the sound tells the pilot
// what the panel already shows.
"use strict";

function createCourierAudio() {
  const audio = {
    ctx: null,
    engineOsc: null,
    engineOsc2: null,
    engineGain: null,
    engineFilter: null,
    muted: false,
    started: false,
  };

  audio.ensure = function ensureCourierAudio() {
    try {
      if (!audio.ctx) {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return;
        audio.ctx = new AudioCtor();
        audio.engineOsc = audio.ctx.createOscillator();
        audio.engineOsc.type = "sawtooth";
        audio.engineOsc.frequency.value = 60;
        audio.engineOsc2 = audio.ctx.createOscillator();
        audio.engineOsc2.type = "triangle";
        audio.engineOsc2.frequency.value = 120;
        audio.engineFilter = audio.ctx.createBiquadFilter();
        audio.engineFilter.type = "lowpass";
        audio.engineFilter.frequency.value = 420;
        audio.engineGain = audio.ctx.createGain();
        audio.engineGain.gain.value = 0;
        audio.engineOsc.connect(audio.engineFilter);
        audio.engineOsc2.connect(audio.engineFilter);
        audio.engineFilter.connect(audio.engineGain);
        audio.engineGain.connect(audio.ctx.destination);
        audio.engineOsc.start();
        audio.engineOsc2.start();
      }
      if (audio.ctx.state === "suspended") audio.ctx.resume();
      audio.started = true;
    } catch (error) {
      audio.started = false;
    }
  };

  audio.setEngine = function setCourierEngine(throttle, speed, flying) {
    if (!audio.ctx || !audio.started) return;
    try {
      const target = audio.muted ? 0 : flying ? 0.035 + throttle * 0.05 : 0.02 + throttle * 0.03;
      audio.engineGain.gain.setTargetAtTime(target, audio.ctx.currentTime, 0.1);
      audio.engineOsc.frequency.setTargetAtTime(52 + throttle * 78 + speed * 0.22, audio.ctx.currentTime, 0.1);
      audio.engineOsc2.frequency.setTargetAtTime(104 + throttle * 156 + speed * 0.44, audio.ctx.currentTime, 0.1);
    } catch (error) {}
  };

  audio.playTone = function playCourierTone(freq, delay, duration, type) {
    if (!audio.ctx || !audio.started || audio.muted) return;
    try {
      const osc = audio.ctx.createOscillator();
      const gain = audio.ctx.createGain();
      osc.type = type || "sine";
      osc.frequency.value = freq;
      const start = audio.ctx.currentTime + (delay || 0);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(audio.ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.05);
    } catch (error) {}
  };

  audio.ringChime = function ringCourierChime() {
    audio.playTone(880, 0, 0.22, "sine");
    audio.playTone(1318, 0.12, 0.3, "sine");
  };

  audio.landingChime = function landingCourierChime() {
    audio.playTone(523, 0, 0.25, "sine");
    audio.playTone(659, 0.14, 0.25, "sine");
    audio.playTone(784, 0.28, 0.4, "sine");
  };

  audio.crashSound = function crashCourierSound() {
    if (!audio.ctx || !audio.started || audio.muted) return;
    try {
      const length = Math.floor(audio.ctx.sampleRate * 0.5);
      const buffer = audio.ctx.createBuffer(1, length, audio.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      }
      const source = audio.ctx.createBufferSource();
      source.buffer = buffer;
      const gain = audio.ctx.createGain();
      gain.gain.value = 0.4;
      source.connect(gain);
      gain.connect(audio.ctx.destination);
      source.start();
    } catch (error) {}
  };

  audio.toggleMute = function toggleCourierMute() {
    audio.muted = !audio.muted;
    return audio.muted;
  };

  return audio;
}
