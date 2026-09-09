// State Management
let totalHeartCount = 0;
let currentTheme = 'white';
let soundEnabled = true;
let isRainMode = false;
let rainInterval = null;
let audioCtx = null;

// Hold to Grow State
let isHolding = false;
let currentX = 0;
let currentY = 0;
let growStartTime = 0;
let activeGrowingHeart = null;
let growAnimFrame = null;
let currentSize = 35; // Base size in px

// DOM Elements
const container = document.getElementById('heart-container');
const countElement = document.getElementById('heart-count');
const themeButtons = document.querySelectorAll('.theme-btn');
const soundToggle = document.getElementById('sound-toggle');
const autoModeToggle = document.getElementById('auto-mode');
const clearBtn = document.getElementById('clear-btn');

// Color Palettes
const THEMES = {
  white: ['#ffffff', '#f8fafc', '#f1f5f9', '#ffffff', '#e2e8f0'],
  classic: ['#ff3366', '#ff0055', '#e6004c', '#ff6699', '#ff1a75'],
  neon: ['#00f3ff', '#ff00ff', '#bf00ff', '#ff0055', '#00ff66'],
  rainbow: ['#ff4500', '#ff8c00', '#ffd700', '#00e676', '#00b0ff', '#d500f9'],
  gold: ['#ffd700', '#ffae00', '#ff8c00', '#fff8dc', '#f3e5ab']
};

// Initialize Web Audio API
function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      audioCtx = new AudioContext();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Sound effects
function playPopSound(pitchFactor = 1.0) {
  if (!soundEnabled) return;
  initAudio();
  if (!audioCtx) return;

  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    const baseFreq = (350 + Math.random() * 200) * pitchFactor;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.6, audioCtx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.18);
  } catch (err) {
    // Audio fallback
  }
}

// SVG Heart Generator
function createSVGHeart(color, size) {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 32 29");
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.style.overflow = "visible";

  const path = document.createElementNS(svgNS, "path");
  path.setAttribute("d", "M23.6,0c-3.4,0-6.3,2.7-7.6,5.6C14.7,2.7,11.8,0,8.4,0C3.8,0,0,3.8,0,8.4c0,9.4,9.5,11.9,16,20.6c6.5-8.7,16-11.2,16-20.6C32,3.8,28.2,0,23.6,0z");
  path.setAttribute("fill", color);
  
  if (currentTheme === 'white') {
    path.setAttribute("filter", `drop-shadow(0 0 12px rgba(255, 255, 255, 0.95)) drop-shadow(0 0 25px rgba(255, 255, 255, 0.7))`);
  } else if (currentTheme === 'neon') {
    path.setAttribute("filter", `drop-shadow(0 0 10px ${color})`);
  } else if (currentTheme === 'gold') {
    path.setAttribute("filter", `drop-shadow(0 2px 8px rgba(255, 215, 0, 0.8))`);
  } else {
    path.setAttribute("filter", `drop-shadow(0 4px 12px rgba(0, 0, 0, 0.35))`);
  }

  svg.appendChild(path);
  return svg;
}

// Start Holding & Growing Heart
function startHolding(x, y) {
  isHolding = true;
  currentX = x;
  currentY = y;
  growStartTime = Date.now();
  currentSize = 35;

  const palette = THEMES[currentTheme];
  const color = palette[Math.floor(Math.random() * palette.length)];

  // Create growing heart element
  activeGrowingHeart = document.createElement('div');
  activeGrowingHeart.className = 'growing-heart';
  activeGrowingHeart.style.left = `${x}px`;
  activeGrowingHeart.style.top = `${y}px`;

  const svgHeart = createSVGHeart(color, currentSize);
  activeGrowingHeart.appendChild(svgHeart);
  container.appendChild(activeGrowingHeart);

  playPopSound(0.8);

  // Growth Animation Loop
  function growStep() {
    if (!isHolding || !activeGrowingHeart) return;

    const elapsed = (Date.now() - growStartTime) / 1000; // seconds
    // Exponential growth curve: starts at 35px, grows up to 250px!
    currentSize = Math.min(260, 35 + Math.pow(elapsed * 2.8, 1.4) * 45);

    const svg = activeGrowingHeart.querySelector('svg');
    if (svg) {
      svg.setAttribute("width", currentSize);
      svg.setAttribute("height", currentSize);
    }

    // Emit subtle charge sparkles while holding
    if (Math.random() < 0.3) {
      spawnSparkles(currentX, currentY, color, 1, currentSize * 0.3);
    }

    growAnimFrame = requestAnimationFrame(growStep);
  }

  growAnimFrame = requestAnimationFrame(growStep);
}

// Move Growing Heart position if user drags
function moveHolding(x, y) {
  if (!isHolding || !activeGrowingHeart) return;
  currentX = x;
  currentY = y;
  activeGrowingHeart.style.left = `${x}px`;
  activeGrowingHeart.style.top = `${y}px`;
}

// Release & Float Heart
function releaseHolding() {
  if (!isHolding) return;
  isHolding = false;
  cancelAnimationFrame(growAnimFrame);

  if (!activeGrowingHeart) return;

  const finalX = currentX;
  const finalY = currentY;
  const finalSize = currentSize;
  const palette = THEMES[currentTheme];
  const color = palette[Math.floor(Math.random() * palette.length)];

  // Remove growing temporary element
  activeGrowingHeart.remove();
  activeGrowingHeart = null;

  // Increment Counter
  totalHeartCount++;
  countElement.textContent = totalHeartCount;

  // Create floating heart element with final size!
  const heartWrapper = document.createElement('div');
  heartWrapper.className = 'heart-element';
  heartWrapper.style.left = `${finalX}px`;
  heartWrapper.style.top = `${finalY}px`;

  // Organic floating physics
  const driftX = (Math.random() - 0.5) * (120 + finalSize * 0.4);
  const floatDist = 160 + finalSize * 0.8;
  const rotStart = (Math.random() - 0.5) * 30;
  const rotMid = (Math.random() - 0.5) * 40;
  const rotEnd = (Math.random() - 0.5) * 50;

  heartWrapper.style.setProperty('--drift-x', `${driftX}px`);
  heartWrapper.style.setProperty('--float-dist', `${floatDist}px`);
  heartWrapper.style.setProperty('--rot-start', `${rotStart}deg`);
  heartWrapper.style.setProperty('--rot-mid', `${rotMid}deg`);
  heartWrapper.style.setProperty('--rot-end', `${rotEnd}deg`);
  heartWrapper.style.setProperty('--start-scale', 1);

  const svgHeart = createSVGHeart(color, finalSize);
  heartWrapper.appendChild(svgHeart);
  container.appendChild(heartWrapper);

  // Big sparkle burst proportional to heart size!
  const sparkleCount = Math.floor(6 + finalSize / 15);
  spawnSparkles(finalX, finalY, color, sparkleCount, finalSize * 0.8);

  // Sound pitch based on size
  const pitchFactor = Math.max(0.6, 1.4 - (finalSize / 200));
  playPopSound(pitchFactor);

  // Remove after animation completes
  setTimeout(() => {
    heartWrapper.remove();
  }, 1800);
}

// Sparkle Burst Helper
function spawnSparkles(x, y, color, count = 8, spread = 60) {
  for (let i = 0; i < count; i++) {
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle-element';
    sparkle.style.left = `${x}px`;
    sparkle.style.top = `${y}px`;

    const sparkleColor = currentTheme === 'white' ? '#ffffff' : color;
    sparkle.style.backgroundColor = sparkleColor;
    sparkle.style.boxShadow = `0 0 10px ${sparkleColor}`;

    const angle = Math.random() * Math.PI * 2;
    const distance = 25 + Math.random() * spread;
    const vx = Math.cos(angle) * distance;
    const vy = Math.sin(angle) * distance;

    sparkle.style.setProperty('--vx', `${vx}px`);
    sparkle.style.setProperty('--vy', `${vy}px`);

    container.appendChild(sparkle);

    setTimeout(() => {
      sparkle.remove();
    }, 850);
  }
}

// Pointer Event Listeners (Press down, hold, release)
window.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button')) return;
  startHolding(e.clientX, e.clientY);
});

window.addEventListener('pointermove', (e) => {
  if (isHolding) {
    moveHolding(e.clientX, e.clientY);
  }
});

window.addEventListener('pointerup', (e) => {
  if (isHolding) {
    releaseHolding();
  }
});

window.addEventListener('pointercancel', () => {
  if (isHolding) {
    releaseHolding();
  }
});

// Controls & Theme Handlers
themeButtons.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    themeButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTheme = btn.dataset.theme;
  });
});

soundToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  soundEnabled = !soundEnabled;
  soundToggle.classList.toggle('active', soundEnabled);
  soundToggle.innerHTML = `<span class="btn-icon">${soundEnabled ? '🔊' : '🔇'}</span> Ses: ${soundEnabled ? 'Açık' : 'Kapalı'}`;
  if (soundEnabled) initAudio();
});

autoModeToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  isRainMode = !isRainMode;
  autoModeToggle.classList.toggle('active', isRainMode);
  autoModeToggle.innerHTML = `<span class="btn-icon">${isRainMode ? '🌧️' : '☁️'}</span> Kalp Yağmuru: ${isRainMode ? 'Açık' : 'Kapalı'}`;

  if (isRainMode) {
    rainInterval = setInterval(() => {
      const rx = Math.random() * window.innerWidth;
      const ry = window.innerHeight + 20;
      
      // Auto rain spawns hearts with randomized sizes
      const randomHoldTime = 100 + Math.random() * 800;
      startHolding(rx, ry);
      setTimeout(() => {
        releaseHolding();
      }, randomHoldTime);
    }, 350);
  } else {
    clearInterval(rainInterval);
  }
});

clearBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  container.innerHTML = '';
  totalHeartCount = 0;
  countElement.textContent = totalHeartCount;
});
