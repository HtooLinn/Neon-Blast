// ======================= SHARED STATE =======================
const SETTINGS_KEY = 'neonblast_settings';

const settings = loadSettings();

function loadSettings() {
  const defaults = { mute: false, music: true, sfx: true, volMusic: 0.4, volSfx: 0.7 };
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    return saved ? Object.assign(defaults, saved) : defaults;
  } catch (e) {
    return defaults;
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ======================= AUDIO ENGINE =======================
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx = null;
let musicNode = null;
let musicGain = null;
let sfxGain = null;

function initAudio() {
  if (actx) return;
  actx = new AudioCtx();
  musicGain = actx.createGain();
  sfxGain = actx.createGain();
  musicGain.gain.value = settings.volMusic;
  sfxGain.gain.value = settings.volSfx;
  musicGain.connect(actx.destination);
  sfxGain.connect(actx.destination);
  startMusic();
}

function startMusic() {
  if (!actx || !settings.music || settings.mute) return;
  stopMusic();
  const notes = [130.81, 164.81, 196.00, 261.63, 130.81, 196.00, 246.94, 261.63];
  let idx = 0;
  function playNote() {
    if (!actx || !settings.music || settings.mute) return;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = notes[idx % notes.length];
    gain.gain.setValueAtTime(0, actx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, actx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(musicGain);
    osc.start(actx.currentTime);
    osc.stop(actx.currentTime + 0.5);
    idx++;
  }
  musicNode = setInterval(playNote, 300);
}

function stopMusic() {
  if (musicNode) { clearInterval(musicNode); musicNode = null; }
}

function playSfx(type) {
  if (!actx || !settings.sfx || settings.mute) return;
  const osc = actx.createOscillator();
  const gain = actx.createGain();
  osc.connect(gain);
  gain.connect(sfxGain);

  if (type === 'place') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, actx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.3, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.15);
    osc.start(); osc.stop(actx.currentTime + 0.15);
  } else if (type === 'clear') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, actx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.4, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.35);
    osc.start(); osc.stop(actx.currentTime + 0.35);
  } else if (type === 'heart') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1600, actx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.35, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.2);
    osc.start(); osc.stop(actx.currentTime + 0.2);
  } else if (type === 'win') {
    [523, 659, 784, 1047].forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'square'; o.frequency.value = f;
      g.gain.setValueAtTime(0, actx.currentTime + i * 0.12);
      g.gain.linearRampToValueAtTime(0.3, actx.currentTime + i * 0.12 + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + i * 0.12 + 0.2);
      o.connect(g); g.connect(sfxGain);
      o.start(actx.currentTime + i * 0.12);
      o.stop(actx.currentTime + i * 0.12 + 0.25);
    });
    return;
  } else if (type === 'lose') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, actx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, actx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.4, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.5);
    osc.start(); osc.stop(actx.currentTime + 0.5);
  }
}

function toggleSetting(key) {
  if (key === 'mute') {
    settings.mute = !settings.mute;
    const el = document.getElementById('toggle-mute');
    if (el) el.classList.toggle('on', settings.mute);
    if (settings.mute) stopMusic(); else startMusic();
  } else if (key === 'music') {
    settings.music = !settings.music;
    const el = document.getElementById('toggle-music');
    if (el) el.classList.toggle('on', settings.music);
    if (settings.music && !settings.mute) startMusic(); else stopMusic();
  } else if (key === 'sfx') {
    settings.sfx = !settings.sfx;
    const el = document.getElementById('toggle-sfx');
    if (el) el.classList.toggle('on', settings.sfx);
  }
  saveSettings();
}

function setVolume(type, val) {
  const v = val / 100;
  if (type === 'music') { settings.volMusic = v; if (musicGain) musicGain.gain.value = v; }
  else { settings.volSfx = v; if (sfxGain) sfxGain.gain.value = v; }
  saveSettings();
}

function toggleMuteGame() {
  settings.mute = !settings.mute;
  const btn = document.getElementById('btn-mute-game');
  if (btn) btn.textContent = settings.mute ? '🔇 MUTED' : '🔊 SOUND';
  if (settings.mute) stopMusic(); else if (settings.music) startMusic();
  saveSettings();
}

// ======================= NAVIGATION =======================
function navigate(page) {
  window.location.href = page;
}

function goBack(defaultPage) {
  if (document.referrer && document.referrer.includes('game.html')) {
    window.location.href = 'game.html';
  } else {
    window.location.href = defaultPage;
  }
}

// ======================= STAR FIELD =======================
function initStars() {
  const c = document.getElementById('stars');
  if (!c) return;
  for (let i = 0; i < 80; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;--d:${2+Math.random()*4}s;animation-delay:${Math.random()*4}s;opacity:${0.1+Math.random()*0.6}`;
    c.appendChild(s);
  }
}

// Init stars on every page load
document.addEventListener('DOMContentLoaded', initStars);
