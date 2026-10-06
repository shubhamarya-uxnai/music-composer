const fileInput = document.getElementById("audio-file");
const trackName = document.getElementById("track-name");
const statusText = document.getElementById("status-text");
const audioPlayer = document.getElementById("audio-player");
const audioStatus = document.getElementById("audio-status");
const metricBpm = document.getElementById("metric-bpm");
const metricDuration = document.getElementById("metric-duration");
const metricBeat = document.getElementById("metric-beat");
const metricPoints = document.getElementById("metric-points");
const viewerModeLabel = document.getElementById("viewer-mode-label");
const viewerSubtitle = document.getElementById("viewer-subtitle");
const frequencyScale = document.getElementById("frequency-scale");
const amplitudeScale = document.getElementById("amplitude-scale");
const timelineZoom = document.getElementById("timeline-zoom");
const timelineZoomValue = document.getElementById("timeline-zoom-value");
const timelinePan = document.getElementById("timeline-pan");
const renderStyle = document.getElementById("render-style");
const baseColor = document.getElementById("base-color");
const activeColor = document.getElementById("active-color");
const canvas = document.getElementById("matrix-canvas");
const ctx = canvas.getContext("2d");
const resetView = document.getElementById("reset-view");
const toggleMotion = document.getElementById("toggle-motion");
const mockLink = document.getElementById("mock-link");
const linkButtonLabel = document.getElementById("link-button-label");
const sourceLink = document.getElementById("source-link");
const viewModeButtons = Array.from(document.querySelectorAll(".view-mode-button"));

const state = {
  points: [],
  bpm: null,
  duration: 0,
  beatSeconds: 0,
  yaw: -0.58,
  pitch: 0.58,
  zoom: 1,
  panX: 0,
  panY: 0,
  auto: false,
  dragging: false,
  lastX: 0,
  lastY: 0,
  objectUrl: null,
  viewMode: "3d",
  frequencyScale: "log",
  amplitudeScale: "db",
  timelineZoom: 1,
  timeOffset: 0,
  renderStyle: "points",
  baseColor: "#4b5563",
  activeColor: "#68d6b9",
};

const analyserSettings = {
  sampleRate: 22050,
  fftSize: 1024,
  hopSize: 512,
  timeBins: 120,
  frequencyBins: 72,
};

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "--";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

function formatAxisTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return formatTime(seconds);
}

function formatHz(value) {
  if (value >= 1000) return `${Number((value / 1000).toFixed(value >= 10000 ? 0 : 1))}kHz`;
  return `${Math.round(value)}Hz`;
}

function formatAmp(value) {
  if (state.amplitudeScale === "db") {
    const db = -72 + value * 72;
    return `${Math.round(db)}dB`;
  }
  return `${Math.round(value * 100)}%`;
}

function setStatus(message) {
  statusText.textContent = message;
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(320, Math.floor(rect.width * scale));
  canvas.height = Math.max(320, Math.floor(rect.height * scale));
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  draw();
}

function createDemoMap() {
  const points = [];
  const timeBins = 96;
  const freqBins = 56;
  for (let t = 0; t < timeBins; t += 1) {
    for (let f = 0; f < freqBins; f += 1) {
      const harmonic = Math.sin(t * 0.16 + f * 0.42) * 0.5 + 0.5;
      const ridge = Math.exp(-Math.pow((f - 12 - Math.sin(t * 0.08) * 8) / 7, 2));
      const pulse = (t % 12) / 12 < 0.34 ? 0.55 : 0.08;
      const amp = Math.max(0, Math.min(1, ridge * 0.72 + harmonic * 0.18 + pulse * Math.exp(-f / 22)));
      if (amp > 0.18) points.push(makePoint(t / (timeBins - 1), f / (freqBins - 1), amp));
    }
  }
  state.points = points;
  state.duration = 32;
  state.bpm = 112;
  state.beatSeconds = 60 / state.bpm;
  updateMetrics();
}

async function handleFile(file) {
  if (!file) return;
  if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
  state.objectUrl = URL.createObjectURL(file);
  audioPlayer.src = state.objectUrl;
  audioPlayer.load();
  audioStatus.textContent = "Ready to play while the map is being analyzed.";
  trackName.textContent = file.name;
  viewerSubtitle.textContent = "Decoding uploaded audio locally...";
  setStatus("Reading file, decoding waveform, estimating beat grid, then calculating the first log-frequency amplitude field.");

  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: analyserSettings.sampleRate });
    const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    const mono = mixToMono(decoded);
    const analysis = analyseAudio(mono, decoded.sampleRate, decoded.duration);
    state.points = analysis.points;
    state.bpm = analysis.bpm;
    state.duration = decoded.duration;
    state.beatSeconds = 60 / analysis.bpm;
    updateMetrics();
    viewerSubtitle.textContent = `${analysis.points.length.toLocaleString()} amplitude points, grouped against a ${analysis.bpm} BPM estimate.`;
    audioStatus.textContent = "Use the controls to listen while rotating the map.";
    setStatus("Map generated. Drag the canvas to rotate, scroll to zoom, and reset whenever the space gets too dramatic.");
    draw();
    audioCtx.close();
  } catch (error) {
    console.error(error);
    audioStatus.textContent = "Playback may still work, but analysis failed for this file.";
    setStatus("The browser could not decode this file. The production path should normalize it first with FFmpeg, then send a clean WAV into the analyzer.");
    viewerSubtitle.textContent = "Decode failed. Try another local audio file.";
  }
}

function mixToMono(buffer) {
  const length = buffer.length;
  const channels = buffer.numberOfChannels;
  const mono = new Float32Array(length);
  for (let c = 0; c < channels; c += 1) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i += 1) {
      mono[i] += data[i] / channels;
    }
  }
  return mono;
}

function analyseAudio(samples, sampleRate, duration) {
  const downsampled = downsample(samples, sampleRate, analyserSettings.sampleRate);
  const bpm = estimateBpm(downsampled, analyserSettings.sampleRate);
  const spectrum = computeLogSpectrum(downsampled, analyserSettings.sampleRate);
  return { bpm, points: spectrum, duration };
}

function downsample(samples, sourceRate, targetRate) {
  if (sourceRate <= targetRate) return samples;
  const ratio = sourceRate / targetRate;
  const length = Math.floor(samples.length / ratio);
  const output = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    output[i] = samples[Math.floor(i * ratio)];
  }
  return output;
}

function estimateBpm(samples, sampleRate) {
  const frame = 1024;
  const hop = 512;
  const energies = [];
  for (let start = 0; start + frame < samples.length; start += hop) {
    let energy = 0;
    for (let i = 0; i < frame; i += 1) energy += Math.abs(samples[start + i]);
    energies.push(energy / frame);
  }

  const onset = [];
  for (let i = 1; i < energies.length; i += 1) onset.push(Math.max(0, energies[i] - energies[i - 1]));
  const minBpm = 70;
  const maxBpm = 180;
  let bestBpm = 120;
  let bestScore = -Infinity;

  for (let bpm = minBpm; bpm <= maxBpm; bpm += 1) {
    const lag = Math.round((60 / bpm) * sampleRate / hop);
    let score = 0;
    for (let i = lag; i < onset.length; i += 1) score += onset[i] * onset[i - lag];
    if (score > bestScore) {
      bestScore = score;
      bestBpm = bpm;
    }
  }
  return bestBpm;
}

function computeLogSpectrum(samples, sampleRate) {
  const { fftSize, hopSize, timeBins, frequencyBins } = analyserSettings;
  const totalFrames = Math.max(1, Math.floor((samples.length - fftSize) / hopSize));
  const frameStep = Math.max(1, Math.floor(totalFrames / timeBins));
  const frequencies = makeLogFrequencies(frequencyBins);
  const points = [];
  let maxAmp = 0;
  const raw = [];

  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += frameStep) {
    const start = frameIndex * hopSize;
    const mags = naiveDft(samples, start, fftSize, frequencies, sampleRate);
    const x = frameIndex / totalFrames;
    for (let f = 0; f < mags.length; f += 1) {
      const amp = mags[f];
      if (amp > maxAmp) maxAmp = amp;
      raw.push({ x, freqHz: frequencies[f], amp });
    }
  }

  for (const item of raw) {
    const ampRaw = item.amp / (maxAmp || 1);
    const y = scaleAmplitude(ampRaw);
    if (y > 0.12) points.push(makePoint(item.x, scaleFrequency(item.freqHz), ampRaw));
  }
  return points;
}

function makePoint(x, z, ampRaw) {
  return {
    x,
    z,
    y: scaleAmplitude(ampRaw),
    ampRaw,
    freqHz: unscaleFrequency(z),
  };
}

function makeLogFrequencies(count) {
  const min = Math.log2(20 / 440);
  const max = Math.log2(20000 / 440);
  return Array.from({ length: count }, (_, i) => {
    const ratio = i / (count - 1);
    return 440 * Math.pow(2, min + (max - min) * ratio);
  });
}

function scaleFrequency(freqHz) {
  const minHz = 20;
  const maxHz = 20000;
  const clamped = Math.max(minHz, Math.min(maxHz, freqHz));
  if (state.frequencyScale === "linear") return (clamped - minHz) / (maxHz - minHz);
  if (state.frequencyScale === "ln") return (Math.log(clamped) - Math.log(minHz)) / (Math.log(maxHz) - Math.log(minHz));
  const min = Math.log2(minHz / 440);
  const max = Math.log2(maxHz / 440);
  return (Math.log2(clamped / 440) - min) / (max - min);
}

function unscaleFrequency(z) {
  const minHz = 20;
  const maxHz = 20000;
  return minHz * Math.pow(maxHz / minHz, z);
}

function scaleAmplitude(ampRaw) {
  const clamped = Math.max(0, Math.min(1, ampRaw));
  if (state.amplitudeScale === "linear") return clamped;
  if (state.amplitudeScale === "ln") return Math.log1p(clamped * 24) / Math.log1p(24);
  const db = 20 * Math.log10(clamped + 0.000001);
  return Math.max(0, Math.min(1, (db + 72) / 72));
}

function rescalePoints() {
  state.points = state.points.map((point) => ({
    ...point,
    z: scaleFrequency(point.freqHz),
    y: scaleAmplitude(point.ampRaw),
  })).filter((point) => point.y > 0.04);
}

function naiveDft(samples, start, size, freqs, sampleRate) {
  const mags = [];
  for (const freq of freqs) {
    let real = 0;
    let imag = 0;
    for (let n = 0; n < size; n += 1) {
      const sample = samples[start + n] || 0;
      const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / (size - 1));
      const phase = (2 * Math.PI * freq * n) / sampleRate;
      real += sample * window * Math.cos(phase);
      imag -= sample * window * Math.sin(phase);
    }
    mags.push(Math.sqrt(real * real + imag * imag) / size);
  }
  return mags;
}

function updateMetrics() {
  metricBpm.textContent = state.bpm ? Math.round(state.bpm) : "--";
  metricDuration.textContent = state.duration ? formatTime(state.duration) : "--";
  metricBeat.textContent = state.beatSeconds ? `${state.beatSeconds.toFixed(2)}s` : "--";
  metricPoints.textContent = state.points.length ? state.points.length.toLocaleString() : "--";
}

function project(point) {
  const visibleX = getVisibleX(point.x);
  const x = (visibleX - 0.5) * 620;
  const z = (0.5 - point.z) * 420;
  const y = point.y * 260;
  const cy = Math.cos(state.yaw);
  const sy = Math.sin(state.yaw);
  const cp = Math.cos(state.pitch);
  const sp = Math.sin(state.pitch);
  const rx = x * cy - z * sy;
  const rz = x * sy + z * cy;
  const ry = y * cp - rz * sp;
  const depth = y * sp + rz * cp;
  const scale = state.zoom * 1.02;
  return {
    x: canvas.clientWidth / 2 + state.panX + rx * scale,
    y: canvas.clientHeight * 0.62 + state.panY - ry * scale,
    depth,
    amp: point.y,
  };
}

function getVisibleX(x) {
  return (x - state.timeOffset) * state.timelineZoom;
}

function visibleToSongX(visibleX) {
  return state.timeOffset + visibleX / state.timelineZoom;
}

function getPlaybackX() {
  if (!state.duration || !audioPlayer.duration) return 0;
  return Math.max(0, Math.min(1, audioPlayer.currentTime / state.duration));
}

function getBeatWidth() {
  if (!state.duration || !state.beatSeconds) return 0.03;
  return Math.max(0.006, state.beatSeconds / state.duration);
}

function syncTimelinePanControl() {
  const maxOffset = Math.max(0, 1 - 1 / state.timelineZoom);
  timelinePan.max = String(maxOffset);
  timelinePan.value = String(Math.min(state.timeOffset, maxOffset));
  timelinePan.disabled = maxOffset <= 0;
}

function drawGrid() {
  const axes = [
    [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, "Time"],
    [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, "Frequency"],
    [{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, "Amplitude"],
  ];
  ctx.lineWidth = 1;
  ctx.font = "12px Inter, system-ui";
  for (const [a, b, label] of axes) {
    const pa = project(a);
    const pb = project(b);
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.fillText(label, pb.x + 8, pb.y + 4);
  }
  drawAxisScaleLabels3D();
  drawTimeMarkers3D();
  drawPlaybackHead3D();
}

function drawAxisScaleLabels3D() {
  ctx.font = "11px Inter, system-ui";
  ctx.fillStyle = "rgba(255,255,255,0.66)";
  for (const tick of getFrequencyTicks().filter((_, index) => index % 2 === 0)) {
    const point = project({ x: 0, y: 0, z: tick.value });
    ctx.fillText(tick.label, point.x - 46, point.y + 4);
  }
  for (const tick of getAmplitudeTicks()) {
    const point = project({ x: 0, y: tick.value, z: 0 });
    ctx.fillText(tick.label, point.x + 8, point.y + 4);
  }
}

function drawTimeMarkers3D() {
  const ticks = getTimeTicks(7);
  ctx.font = "11px Inter, system-ui";
  for (const tick of ticks) {
    const vx = getVisibleX(tick.songX);
    if (vx < -0.02 || vx > 1.02) continue;
    const base = project({ x: tick.songX, y: 0, z: 0 });
    const stem = project({ x: tick.songX, y: 0.05, z: 0 });
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(stem.x, stem.y);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.68)";
    ctx.fillText(tick.label, stem.x - 10, stem.y + 16);
  }
}

function drawPlaybackHead3D() {
  const headX = getPlaybackX();
  const width = getBeatWidth();
  const left = Math.max(0, headX - width / 2);
  const right = Math.min(1, headX + width / 2);
  const near = [
    { x: left, y: 0, z: 0 },
    { x: right, y: 0, z: 0 },
    { x: right, y: 1, z: 0 },
    { x: left, y: 1, z: 0 },
  ].map(project);
  const far = [
    { x: left, y: 0, z: 1 },
    { x: right, y: 0, z: 1 },
    { x: right, y: 1, z: 1 },
    { x: left, y: 1, z: 1 },
  ].map(project);
  ctx.fillStyle = "rgba(246,200,95,0.16)";
  ctx.strokeStyle = "rgba(246,200,95,0.72)";
  for (const corners of [near, far]) {
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    corners.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(near[i].x, near[i].y);
    ctx.lineTo(far[i].x, far[i].y);
    ctx.stroke();
  }
}

function setViewMode(mode) {
  state.viewMode = mode;
  state.auto = mode === "3d" ? state.auto : false;
  toggleMotion.textContent = state.auto ? "Ⅱ" : "▶";
  toggleMotion.disabled = mode !== "3d";
  viewModeButtons.forEach((button) => {
    button.dataset.active = button.dataset.mode === mode ? "true" : "false";
  });

  if (mode === "3d") {
    viewerModeLabel.textContent = "3D acoustic space";
  } else if (mode === "amplitude") {
    viewerModeLabel.textContent = "2D amplitude over time";
  } else {
    viewerModeLabel.textContent = "2D frequency over time";
  }
  draw();
}

function colorForAmp(amp) {
  if (amp > 0.72) return `rgba(246, 200, 95, ${0.34 + amp * 0.62})`;
  if (amp > 0.42) return `rgba(104, 214, 185, ${0.28 + amp * 0.58})`;
  return `rgba(42, 125, 225, ${0.22 + amp * 0.52})`;
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbaFromHex(hex, alpha) {
  const rgb = hexToRgb(hex);
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

function isInActiveBeat(x) {
  const center = getPlaybackX();
  const half = getBeatWidth() / 2;
  return x >= center - half && x <= center + half;
}

function draw() {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  if (state.viewMode === "amplitude") {
    drawAmplitude2D();
    return;
  }
  if (state.viewMode === "frequency") {
    drawFrequency2D();
    return;
  }
  drawGrid();
  if (state.renderStyle === "surface" || state.renderStyle === "hybrid") drawContinuousSurface3D();
  if (state.renderStyle !== "surface") drawPoints3D();
}

function drawPoints3D() {
  const plotted = state.points.map((p) => ({ ...project(p), amp: p.y })).sort((a, b) => a.depth - b.depth);
  for (const p of plotted) {
    const r = 1.1 + p.amp * 3.8 * state.zoom;
    ctx.fillStyle = isInActiveBeat(p.x) ? rgbaFromHex(state.activeColor, 0.36 + p.amp * 0.56) : rgbaFromHex(state.baseColor, 0.10 + p.amp * 0.16);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawContinuousSurface3D() {
  const timeBins = 84;
  const freqBins = 42;
  const grid = Array.from({ length: timeBins }, () => new Array(freqBins).fill(0));
  for (const point of state.points) {
    const tx = Math.max(0, Math.min(timeBins - 1, Math.round(point.x * (timeBins - 1))));
    const fz = Math.max(0, Math.min(freqBins - 1, Math.round(point.z * (freqBins - 1))));
    grid[tx][fz] = Math.max(grid[tx][fz], point.y);
  }
  for (let t = 0; t < timeBins - 1; t += 1) {
    for (let f = 0; f < freqBins - 1; f += 1) {
      const amp = (grid[t][f] + grid[t + 1][f] + grid[t][f + 1] + grid[t + 1][f + 1]) / 4;
      if (amp < 0.045) continue;
      const cellX = (t + 0.5) / (timeBins - 1);
      const corners = [
        project({ x: t / (timeBins - 1), z: f / (freqBins - 1), y: grid[t][f] }),
        project({ x: (t + 1) / (timeBins - 1), z: f / (freqBins - 1), y: grid[t + 1][f] }),
        project({ x: (t + 1) / (timeBins - 1), z: (f + 1) / (freqBins - 1), y: grid[t + 1][f + 1] }),
        project({ x: t / (timeBins - 1), z: (f + 1) / (freqBins - 1), y: grid[t][f + 1] }),
      ];
      ctx.fillStyle = isInActiveBeat(cellX) ? rgbaFromHex(state.activeColor, 0.22 + amp * 0.62) : rgbaFromHex(state.baseColor, 0.08 + amp * 0.12);
      ctx.strokeStyle = "rgba(255,255,255,0.035)";
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      corners.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
}

function getTimeTicks(count) {
  const ticks = [];
  const visibleStart = visibleToSongX(0);
  const visibleEnd = visibleToSongX(1);
  const duration = state.duration || 32;
  for (let i = 0; i <= count; i += 1) {
    const songX = visibleStart + ((visibleEnd - visibleStart) * i) / count;
    const seconds = Math.max(0, Math.min(duration, songX * duration));
    ticks.push({ songX, label: formatAxisTime(seconds), seconds });
  }
  return ticks;
}

function drawPlotFrame(yLabel, yTicks) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const padLeft = 72;
  const padRight = 26;
  const padTop = 30;
  const padBottom = 54;
  ctx.fillStyle = "#05070d";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 8; i += 1) {
    const x = padLeft + ((width - padLeft - padRight) * i) / 8;
    ctx.beginPath();
    ctx.moveTo(x, padTop);
    ctx.lineTo(x, height - padBottom);
    ctx.stroke();
  }
  const ticks = yTicks || [];
  for (let i = 0; i < ticks.length; i += 1) {
    const y = padTop + (height - padTop - padBottom) * (1 - ticks[i].value);
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.52)";
  ctx.beginPath();
  ctx.moveTo(padLeft, padTop);
  ctx.lineTo(padLeft, height - padBottom);
  ctx.lineTo(width - padRight, height - padBottom);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = "12px Inter, system-ui";
  ctx.fillText("Time", width - padRight - 34, height - 16);
  ctx.textAlign = "center";
  for (const tick of getTimeTicks(8)) {
    const vx = getVisibleX(tick.songX);
    if (vx < -0.01 || vx > 1.01) continue;
    const x = padLeft + (width - padLeft - padRight) * vx;
    ctx.fillStyle = "rgba(255,255,255,0.62)";
    ctx.fillText(tick.label, x, height - 32);
  }
  ctx.textAlign = "right";
  for (const tick of ticks) {
    const y = padTop + (height - padTop - padBottom) * (1 - tick.value);
    ctx.fillStyle = "rgba(255,255,255,0.62)";
    ctx.fillText(tick.label, padLeft - 8, y + 4);
  }
  ctx.textAlign = "left";
  ctx.save();
  ctx.translate(18, padTop + 118);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();
  return { width, height, padLeft, padRight, padTop, padBottom };
}

function drawPlaybackHead2D(frame) {
  const plotWidth = frame.width - frame.padLeft - frame.padRight;
  const plotHeight = frame.height - frame.padTop - frame.padBottom;
  const center = getVisibleX(getPlaybackX());
  const width = getBeatWidth() * state.timelineZoom;
  const x = frame.padLeft + center * plotWidth;
  const w = Math.max(2, width * plotWidth);
  ctx.fillStyle = "rgba(246,200,95,0.18)";
  ctx.fillRect(x - w / 2, frame.padTop, w, plotHeight);
  ctx.strokeStyle = "rgba(246,200,95,0.9)";
  ctx.beginPath();
  ctx.moveTo(x, frame.padTop);
  ctx.lineTo(x, frame.padTop + plotHeight);
  ctx.stroke();
}

function drawAmplitude2D() {
  const frame = drawPlotFrame("Amplitude", getAmplitudeTicks());
  const buckets = new Array(140).fill(0);
  for (const point of state.points) {
    const vx = getVisibleX(point.x);
    if (vx < 0 || vx > 1) continue;
    const i = Math.max(0, Math.min(buckets.length - 1, Math.round(vx * (buckets.length - 1))));
    buckets[i] = Math.max(buckets[i], point.y);
  }
  const plotWidth = frame.width - frame.padLeft - frame.padRight;
  const plotHeight = frame.height - frame.padTop - frame.padBottom;
  if (state.renderStyle !== "points") {
    ctx.strokeStyle = "rgba(104,214,185,0.96)";
    ctx.lineWidth = 2;
    ctx.beginPath();
  }
  buckets.forEach((amp, i) => {
    const x = frame.padLeft + (plotWidth * i) / (buckets.length - 1);
    const y = frame.padTop + plotHeight * (1 - amp);
    if (state.renderStyle === "points") {
      const songX = visibleToSongX(i / (buckets.length - 1));
      ctx.fillStyle = isInActiveBeat(songX) ? rgbaFromHex(state.activeColor, 0.45 + amp * 0.5) : rgbaFromHex(state.baseColor, 0.18 + amp * 0.18);
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  if (state.renderStyle !== "points") {
    ctx.stroke();
    ctx.fillStyle = rgbaFromHex(state.baseColor, 0.14);
    ctx.lineTo(frame.padLeft + plotWidth, frame.padTop + plotHeight);
    ctx.lineTo(frame.padLeft, frame.padTop + plotHeight);
    ctx.closePath();
    ctx.fill();
  }
  drawPlaybackHead2D(frame);
}

function drawFrequency2D() {
  const frame = drawPlotFrame("Frequency", getFrequencyTicks());
  const plotWidth = frame.width - frame.padLeft - frame.padRight;
  const plotHeight = frame.height - frame.padTop - frame.padBottom;
  for (const point of state.points) {
    const vx = getVisibleX(point.x);
    if (vx < 0 || vx > 1) continue;
    const x = frame.padLeft + vx * plotWidth;
    const y = frame.padTop + (1 - point.z) * plotHeight;
    ctx.fillStyle = isInActiveBeat(point.x) ? rgbaFromHex(state.activeColor, 0.36 + point.y * 0.56) : rgbaFromHex(state.baseColor, 0.10 + point.y * 0.16);
    ctx.fillRect(x, y, 3, 3);
  }
  if (state.frequencyScale !== "linear") {
    const center = scaleFrequency(440);
    ctx.fillStyle = "rgba(255,255,255,0.52)";
    ctx.font = "11px Inter, system-ui";
    ctx.fillText("440Hz", frame.padLeft + 8, frame.padTop + plotHeight * (1 - center));
  }
  drawPlaybackHead2D(frame);
}

function getFrequencyTicks() {
  if (state.frequencyScale === "linear") {
    return [20, 5000, 10000, 15000, 20000].map((freq) => ({ value: scaleFrequency(freq), label: formatHz(freq) }));
  }
  if (state.frequencyScale === "ln") {
    return [20, 100, 440, 1000, 5000, 20000].map((freq) => ({ value: scaleFrequency(freq), label: formatHz(freq) }));
  }
  return [20, 55, 110, 220, 440, 880, 1760, 5000, 20000].map((freq) => ({ value: scaleFrequency(freq), label: formatHz(freq) }));
}

function getAmplitudeTicks() {
  if (state.amplitudeScale === "db") {
    return [-72, -48, -24, -12, 0].map((db) => ({ value: (db + 72) / 72, label: `${db}dB` }));
  }
  return [0, 0.25, 0.5, 0.75, 1].map((value) => ({ value, label: formatAmp(value) }));
}

function animate() {
  if (state.auto) {
    state.yaw -= 0.0035;
    draw();
  }
  if (!audioPlayer.paused && !audioPlayer.ended) draw();
  requestAnimationFrame(animate);
}

fileInput.addEventListener("change", (event) => handleFile(event.target.files[0]));

mockLink.addEventListener("click", () => {
  const value = sourceLink.value.trim();
  if (!value) {
    setStatus("Paste a public URL first. In the production build, the backend would test it with yt-dlp and normalize the result through FFmpeg.");
    return;
  }

  mockLink.disabled = true;
  mockLink.dataset.loading = "true";
  linkButtonLabel.textContent = "Checking";
  trackName.textContent = "Checking link";
  viewerSubtitle.textContent = "Checking link import path...";
  setStatus("Checking the import path...");

  window.setTimeout(() => {
    mockLink.disabled = false;
    mockLink.dataset.loading = "false";
    linkButtonLabel.textContent = "Check link";
    trackName.textContent = "Link needs backend";
    viewerSubtitle.textContent = "Upload works now. Link import is the next backend step.";
    setStatus("V0 cannot fetch music links in-browser yet. Next: yt-dlp + FFmpeg backend.");
  }, 1400);
});

resetView.addEventListener("click", () => {
  state.yaw = -0.58;
  state.pitch = 0.58;
  state.zoom = 1;
  state.panX = 0;
  state.panY = 0;
  state.timelineZoom = 1;
  state.timeOffset = 0;
  timelineZoom.value = "1";
  timelineZoomValue.textContent = "1.0x";
  syncTimelinePanControl();
  draw();
});

toggleMotion.addEventListener("click", () => {
  if (state.viewMode !== "3d") return;
  state.auto = !state.auto;
  toggleMotion.textContent = state.auto ? "Ⅱ" : "▶";
});

viewModeButtons.forEach((button) => {
  button.addEventListener("click", () => setViewMode(button.dataset.mode));
});

frequencyScale.addEventListener("change", (event) => {
  state.frequencyScale = event.target.value;
  rescalePoints();
  draw();
});

amplitudeScale.addEventListener("change", (event) => {
  state.amplitudeScale = event.target.value;
  rescalePoints();
  draw();
});

timelineZoom.addEventListener("input", (event) => {
  state.timelineZoom = Number(event.target.value);
  state.timeOffset = Math.min(state.timeOffset, 1 - 1 / state.timelineZoom);
  timelineZoomValue.textContent = `${state.timelineZoom.toFixed(1)}x`;
  syncTimelinePanControl();
  draw();
});

timelinePan.addEventListener("input", (event) => {
  state.timeOffset = Number(event.target.value);
  draw();
});

renderStyle.addEventListener("change", (event) => {
  state.renderStyle = event.target.value;
  draw();
});

baseColor.addEventListener("input", (event) => {
  state.baseColor = event.target.value;
  draw();
});

activeColor.addEventListener("input", (event) => {
  state.activeColor = event.target.value;
  draw();
});

audioPlayer.addEventListener("timeupdate", draw);
audioPlayer.addEventListener("seeked", draw);

canvas.addEventListener("pointerdown", (event) => {
  state.dragging = true;
  state.lastX = event.clientX;
  state.lastY = event.clientY;
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!state.dragging) return;
  const dx = event.clientX - state.lastX;
  const dy = event.clientY - state.lastY;
  if (state.viewMode === "3d") {
    state.yaw -= dx * 0.006;
    state.pitch = Math.max(0.18, Math.min(1.18, state.pitch + dy * 0.004));
  } else {
    const delta = -dx / Math.max(1, canvas.clientWidth) / state.timelineZoom;
    const maxOffset = Math.max(0, 1 - 1 / state.timelineZoom);
    state.timeOffset = Math.max(0, Math.min(maxOffset, state.timeOffset + delta));
    syncTimelinePanControl();
  }
  state.lastX = event.clientX;
  state.lastY = event.clientY;
  draw();
});

canvas.addEventListener("pointerup", () => {
  state.dragging = false;
});

canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  state.zoom = Math.max(0.55, Math.min(2.2, state.zoom + (event.deltaY > 0 ? -0.08 : 0.08)));
  draw();
}, { passive: false });

window.addEventListener("resize", resizeCanvas);

createDemoMap();
syncTimelinePanControl();
resizeCanvas();
animate();
