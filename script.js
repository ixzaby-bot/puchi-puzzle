'use strict';

const columns = 8;
const rows = 8;
const total = columns * rows;
const revivalDelay = 2500;
const board = document.getElementById('board');
const countLabel = document.getElementById('count');
const message = document.getElementById('message');
const resetButton = document.getElementById('reset');
const soundButton = document.getElementById('sound');
const progress = document.querySelector('[role="progressbar"]');
const progressFill = document.getElementById('progress-fill');
let poppedCount = 0;
let restingCount = 0;
let soundEnabled = true;
let audioContext;
const bubbleHues = [0, 210, 48, 145, 280, 325, 25];
const activeBursts = new Set();
const damageLimit = 3;
const blackPuniChance = 0.005;
let cells = [];
const pendingTimers = new Set();
let celebration = null;
const activePresses = new Map();

function cellAtPoint(x, y) {
  const rect = board.getBoundingClientRect();
  const column = Math.floor((x - rect.left) / rect.width * columns);
  const row = Math.floor((y - rect.top) / rect.height * rows);
  return column >= 0 && column < columns && row >= 0 && row < rows ? row * columns + column : -1;
}

function releasePress(pointerId) {
  const press = activePresses.get(pointerId);
  if (!press) return;
  activePresses.delete(pointerId);
  press.bubble.classList.remove('pressing');
  if (board.hasPointerCapture(pointerId)) board.releasePointerCapture(pointerId);
}

function cancelPresses() {
  for (const pointerId of [...activePresses.keys()]) releasePress(pointerId);
}

board.addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  const index = cellAtPoint(event.clientX, event.clientY);
  if (index < 0 || cells[index].bubble.disabled) return;
  const cell = cells[index];
  if ([...activePresses.values()].some(press => press.bubble === cell.bubble)) return;
  event.preventDefault();
  activePresses.set(event.pointerId, {
    index, bubble: cell.bubble, version: cell.version, x: event.clientX, y: event.clientY
  });
  board.setPointerCapture(event.pointerId);
  cell.bubble.classList.remove('reviving');
  cell.bubble.classList.add('pressing');
  playPop(cell.isBlack ? 'black' : cell.hue, true);
});

board.addEventListener('pointermove', event => {
  const press = activePresses.get(event.pointerId);
  if (!press) return;
  // 指を大きくずらしたときは、潰さずに元の形へ戻します。
  if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 22) releasePress(event.pointerId);
});

board.addEventListener('pointerup', event => {
  const press = activePresses.get(event.pointerId);
  if (!press) return;
  event.preventDefault();
  releasePress(event.pointerId);
  const cell = cells[press.index];
  if (cell.version !== press.version || cell.bubble.disabled || cellAtPoint(event.clientX, event.clientY) !== press.index) return;
  popBubble(cell.bubble, press.index);
  // 対応する端末だけ、ごく短い振動を加えます。
  try { if (typeof navigator.vibrate === 'function') navigator.vibrate(cell.isBlack ? [12, 20, 18] : 9); } catch {}
});
board.addEventListener('pointercancel', event => releasePress(event.pointerId));
board.addEventListener('lostpointercapture', event => releasePress(event.pointerId));
window.addEventListener('blur', cancelPresses);
document.addEventListener('visibilitychange', () => { if (document.hidden) cancelPresses(); });

function celebrateTen() {
  if (celebration) return;
  const layer = document.createElement('div');
  layer.className = 'celebration';
  layer.setAttribute('aria-hidden', 'true');
  const title = document.createElement('div');
  title.className = 'celebration-title';
  const number = document.createElement('strong');
  number.textContent = '10';
  const caption = document.createElement('span');
  caption.textContent = '連鎖達成！';
  title.appendChild(number);
  title.appendChild(caption);
  layer.appendChild(title);
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (let burst = 0; burst < 5; burst++) {
      const firework = document.createElement('div');
      firework.className = 'firework';
      firework.style.left = `${15 + burst * 17}%`;
      firework.style.top = `${25 + burst % 3 * 18}%`;
      for (let i = 0; i < 24; i++) {
        const spark = document.createElement('span');
        spark.className = 'confetti';
        const angle = i / 24 * Math.PI * 2;
        const distance = 70 + Math.random() * 80;
        spark.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
        spark.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
        spark.style.setProperty('--spin', `${i * 37}deg`);
        spark.style.setProperty('--particle-color', `hsl(${i * 37} 100% 65%)`);
        spark.style.animationDelay = `${burst * .15}s`;
        firework.appendChild(spark);
      }
      layer.appendChild(firework);
    }
  }
  celebration = layer;
  document.body.appendChild(layer);
  activeBursts.add(layer);
  later(() => {
    layer.remove();
    activeBursts.delete(layer);
    if (celebration === layer) celebration = null;
  }, 2400);
}

function updateRestingCount() {
  progress.setAttribute('aria-valuenow', restingCount);
  progressFill.style.width = `${restingCount / total * 100}%`;
}

function reviveBubble(index) {
  const cell = cells[index];
  cell.version++;
  cell.damage = 0;
  cell.bubble.replaceChildren();
  randomizeCell(cell, index, true);
  cell.bubble.disabled = false;
  restingCount--;
  updateRestingCount();
}

function randomizeCell(cell, index, reviving = false) {
  cell.hue = bubbleHues[Math.floor(Math.random() * bubbleHues.length)];
  cell.isBlack = Math.random() < blackPuniChance;
  cell.bubble.className = `bubble${cell.isBlack ? ' black-puni' : ''}${reviving ? ' reviving' : ''}`;
  cell.bubble.style.setProperty('--hue', cell.hue);
  cell.bubble.setAttribute('aria-label', `${index + 1}番目の${cell.isBlack ? '黒ぷに：周囲8マスを一気に割る' : 'プチプチをつぶす'}`);
}

function surrounding(index) {
  const row = Math.floor(index / columns), column = index % columns;
  const result = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = row + dr, c = column + dc;
      if ((dr || dc) && r >= 0 && r < rows && c >= 0 && c < columns) result.push(r * columns + c);
    }
  }
  return result;
}

function showBlackBlast(bubble) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const rect = bubble.getBoundingClientRect();
  const blast = document.createElement('div');
  blast.className = 'black-blast';
  blast.setAttribute('aria-hidden', 'true');
  blast.style.left = `${rect.left + rect.width / 2}px`;
  blast.style.top = `${rect.top + rect.height / 2}px`;
  blast.style.setProperty('--blast-size', `${rect.width * 3}px`);
  document.body.appendChild(blast);
  activeBursts.add(blast);
  later(() => { blast.remove(); activeBursts.delete(blast); }, 650);
}

function later(action, delay) {
  const timer = window.setTimeout(() => {
    pendingTimers.delete(timer);
    action();
  }, delay);
  pendingTimers.add(timer);
}

function neighbors(index) {
  const row = Math.floor(index / columns);
  const column = index % columns;
  return [row > 0 ? index - columns : -1, row < rows - 1 ? index + columns : -1,
    column > 0 ? index - 1 : -1, column < columns - 1 ? index + 1 : -1].filter(i => i >= 0);
}

function splashColor(source, target, hue) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const splash = document.createElement('span');
  splash.className = 'color-splash';
  splash.setAttribute('aria-hidden', 'true');
  splash.style.left = `${from.left + from.width / 2}px`;
  splash.style.top = `${from.top + from.height / 2}px`;
  splash.style.setProperty('--dx', `${to.left + to.width / 2 - from.left - from.width / 2}px`);
  splash.style.setProperty('--dy', `${to.top + to.height / 2 - from.top - from.height / 2}px`);
  splash.style.setProperty('--paint', `hsl(${hue} 95% 58%)`);
  document.body.appendChild(splash);
  activeBursts.add(splash);
  later(() => { splash.remove(); activeBursts.delete(splash); }, 300);
}

function spreadDamage(index, depth, cascade) {
  const source = cells[index];
  for (const neighbor of neighbors(index)) {
    const target = cells[neighbor];
    if (target.bubble.disabled) continue;
    const version = target.version;
    const hue = source.hue;
    splashColor(source.bubble, target.bubble, source.hue);
    later(() => {
      if (target.version !== version || target.bubble.disabled || target.damage >= damageLimit) return;
      target.damage++;
      const stain = document.createElement('span');
      stain.className = 'paint-stain';
      stain.style.setProperty('--paint', `hsl(${hue} 95% 55%)`);
      stain.style.setProperty('--spot', target.damage - 1);
      target.bubble.appendChild(stain);
      target.bubble.classList.add('damaged');
      target.bubble.setAttribute('aria-label', `${neighbor + 1}番目の${target.isBlack ? '黒ぷに：周囲8マスを一気に割る' : 'プチプチ'}、ダメージ${target.damage}/${damageLimit}`);
      if (target.damage === damageLimit) {
        target.bubble.classList.add('primed');
        later(() => {
          if (target.version === version) popBubble(target.bubble, neighbor, depth + 1, cascade);
        }, 130);
      }
    }, 200);
  }
}

// エフェクトは画面の上に重ね、タップの邪魔をしないようにします。
function showBurst(bubble, depth) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const rect = bubble.getBoundingClientRect();
  const burst = document.createElement('div');
  burst.className = 'burst';
  burst.setAttribute('aria-hidden', 'true');
  burst.style.left = `${rect.left + rect.width / 2}px`;
  burst.style.top = `${rect.top + rect.height / 2}px`;
  const level = Math.min(depth, 10);
  burst.style.setProperty('--burst-scale', 1 + level * .08);
  burst.style.setProperty('--burst-color', `hsl(${bubble.style.getPropertyValue('--hue')} 85% 48%)`);
  for (let r = 0; r < 1 + Math.floor(level / 3); r++) {
    const ring = document.createElement('span');
    ring.className = 'burst-ring';
    ring.style.animationDelay = `${r * .07}s`;
    burst.appendChild(ring);
  }
  const particleCount = 18 + level * 4;
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('span');
    particle.className = 'confetti';
    const angle = Math.PI * 2 * i / particleCount;
    const distance = 45 + Math.random() * 55 + level * 6;
    particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    particle.style.setProperty('--dy', `${Math.sin(angle) * distance + 25}px`);
    particle.style.setProperty('--spin', `${Math.random() * 540 - 270}deg`);
    particle.style.setProperty('--particle-color', `hsl(${depth >= 5 ? i * 47 : bubble.style.getPropertyValue('--hue')} 95% ${50 + i % 3 * 15}%)`);
    burst.appendChild(particle);
  }
  const word = document.createElement('span');
  word.className = 'burst-word';
  word.textContent = depth > 0 ? `${depth}連鎖！` : 'ぷちっ！';
  burst.appendChild(word);
  document.body.appendChild(burst);
  activeBursts.add(burst);
  later(() => {
    burst.remove();
    activeBursts.delete(burst);
  }, 1000);
}

// 色ごとに音程・音色を変え、短いノイズを重ねて「プチッ」を残します。
const colorSounds = {
  black: { frequency: 82, type: 'triangle', duration: .23, cutoff: 700 },
  0:   { frequency: 196, type: 'sine', duration: .11, cutoff: 1100 },
  210: { frequency: 294, type: 'triangle', duration: .14, cutoff: 1900 },
  48:  { frequency: 784, type: 'sine', duration: .10, cutoff: 4200 },
  145: { frequency: 392, type: 'sine', duration: .16, cutoff: 2300 },
  280: { frequency: 494, type: 'triangle', duration: .18, cutoff: 1500 },
  325: { frequency: 659, type: 'sine', duration: .13, cutoff: 3200 },
  25:  { frequency: 247, type: 'triangle', duration: .09, cutoff: 2800 }
};

function playPop(hue, pressing = false) {
  if (!soundEnabled) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioContext ||= new AudioContextClass();
    if (audioContext.state === 'suspended') void audioContext.resume().catch(() => {});
    const sound = colorSounds[hue] || colorSounds[0];
    const now = audioContext.currentTime;
    const duration = pressing ? .04 : .095;
    const buffer = audioContext.createBuffer(1, Math.ceil(audioContext.sampleRate * duration), audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
    }
    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(sound.cutoff, now);
    filter.frequency.exponentialRampToValueAtTime(Math.max(180, sound.cutoff * .18), now + duration);
    gain.gain.value = pressing ? .025 : .32;
    source.connect(filter).connect(gain).connect(audioContext.destination);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    source.start(now);
    const tone = audioContext.createOscillator();
    const toneGain = audioContext.createGain();
    tone.type = sound.type;
    tone.frequency.setValueAtTime(sound.frequency * (pressing ? .8 : 1.6), now);
    tone.frequency.exponentialRampToValueAtTime(sound.frequency * (pressing ? .55 : .65), now + .065);
    const toneDuration = pressing ? .085 : sound.duration;
    toneGain.gain.setValueAtTime(0, now);
    toneGain.gain.linearRampToValueAtTime(pressing ? .045 : .18, now + .004);
    toneGain.gain.exponentialRampToValueAtTime(.001, now + toneDuration);
    tone.connect(toneGain).connect(audioContext.destination);
    tone.onended = () => { tone.disconnect(); toneGain.disconnect(); };
    tone.start(now);
    tone.stop(now + toneDuration + .01);
  } catch {
    // 音が使えない環境でもゲームは続けられます。
  }
}

function popBubble(bubble, index, depth = 0, cascade = { celebrated: false }) {
  if (bubble.disabled) return;
  for (const [id, press] of activePresses) {
    if (press.bubble === bubble) releasePress(id);
  }
  bubble.classList.remove('reviving');
  bubble.disabled = true;
  bubble.classList.add('popped');
  bubble.setAttribute('aria-label', `${index + 1}番目：つぶれています`);
  poppedCount++;
  restingCount++;
  countLabel.textContent = poppedCount;
  updateRestingCount();
  const isBlack = cells[index].isBlack;
  playPop(isBlack ? 'black' : cells[index].hue);
  showBurst(bubble, depth);
  spreadDamage(index, depth, cascade);
  if (depth >= 10 && !cascade.celebrated) {
    cascade.celebrated = true;
    celebrateTen();
  }
  message.textContent = depth > 0 ? `${depth}連鎖！ どんどん、ぷちぷち！` : '約2.5秒で復活！ ずっと遊べるよ。';
  if (depth === 10) message.textContent = '10連鎖達成！ レインボーフィーバー！';
  later(() => reviveBubble(index), revivalDelay);
  if (isBlack) {
    showBlackBlast(bubble);
    message.textContent = '黒ぷに、どかん！ 周囲8マスを一気にぷちっ！';
    for (const neighbor of surrounding(index)) {
      popBubble(cells[neighbor].bubble, neighbor, depth + 1, cascade);
    }
  }
}

function startGame() {
  cancelPresses();
  pendingTimers.forEach(timer => window.clearTimeout(timer));
  pendingTimers.clear();
  cells = [];
  activeBursts.forEach(burst => burst.remove());
  activeBursts.clear();
  celebration = null;
  poppedCount = 0;
  restingCount = 0;
  countLabel.textContent = '0';
  progress.setAttribute('aria-valuenow', '0');
  progress.setAttribute('aria-valuemax', total);
  board.style.setProperty('--columns', columns);
  progressFill.style.width = '0%';
  message.textContent = '自動で復活する、無限ぷちぷち！';
  resetButton.hidden = false;
  board.replaceChildren();
  for (let index = 0; index < total; index++) {
    const bubble = document.createElement('button');
    bubble.type = 'button';
    const cell = { bubble, damage: 0, version: 0 };
    randomizeCell(cell, index);
    cells.push(cell);
    bubble.addEventListener('click', event => {
      // タッチ・マウスはpointerupで処理。キーボード操作は通常のclickを使います。
      if ('PointerEvent' in window && event.detail !== 0) return;
      popBubble(bubble, index);
    });
    board.appendChild(bubble);
  }
}

// 丸の間の小さな余白も、そのマスのプチプチとして押せます。
board.addEventListener('click', event => {
  if (event.target !== board) return;
  if ('PointerEvent' in window) return;
  const index = cellAtPoint(event.clientX, event.clientY);
  if (index < 0) return;
  popBubble(cells[index].bubble, index);
});

soundButton.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundButton.setAttribute('aria-pressed', String(soundEnabled));
  soundButton.textContent = soundEnabled ? '♪ 音 ON' : '♪ 音 OFF';
});
resetButton.addEventListener('click', () => {
  startGame();
  board.firstElementChild.focus({ preventScroll: true });
});
startGame();
