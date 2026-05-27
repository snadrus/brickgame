import { VIRTUAL_W, VIRTUAL_H } from './constants.js';
import { Sprites } from './sprites.js';
import { AudioSystem } from './audio.js';
import { Input } from './input.js';
import { Renderer } from './render.js';
import { Game } from './game.js';
import { startLoop } from './loop.js';

const MUSIC_MANIFEST = {
  title: 'assets/music/title.mp3',
  'level-1': 'assets/music/level-1.mp3',
  'level-2': 'assets/music/level-2.mp3',
  'level-3': 'assets/music/level-3.mp3',
  'level-4': 'assets/music/level-4.mp3',
  'level-5': 'assets/music/level-5.mp3',
  'level-6': 'assets/music/level-6.mp3',
  'level-7': 'assets/music/level-7.mp3',
  'level-8': 'assets/music/level-8.mp3',
  victory: 'assets/music/victory.mp3',
};

const VOL_KEY = 'brickgame.volume';
const MUTE_KEY = 'brickgame.muted';

function bootstrap() {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  Sprites.init();

  const audio = new AudioSystem();
  audio.loadMusic(MUSIC_MANIFEST);

  const savedVol = Number(localStorage.getItem(VOL_KEY));
  if (!Number.isNaN(savedVol) && savedVol >= 0 && savedVol <= 1) {
    audio.setMusicVolume(savedVol);
  } else {
    audio.setMusicVolume(0.6);
  }
  const savedMute = localStorage.getItem(MUTE_KEY) === '1';
  audio.setMuted(savedMute);

  const renderer = new Renderer(canvas, ctx);
  const input = new Input(canvas, VIRTUAL_W, VIRTUAL_H);
  const game = new Game({ canvas, ctx, audio, input, renderer });

  input.bind({
    onMove: (x) => { /* paddle target picked up in update */ },
    onLaunch: () => { audio.unlock(); game.onLaunch(); },
    onFire: () => { game.onFire(); },
    onPause: () => { game.onPause(); },
    onMute: () => { game.onMute(); persistMute(); },
    onRestart: () => { game.onRestart(); },
  });

  function persistMute() {
    try { localStorage.setItem(MUTE_KEY, audio._muted ? '1' : '0'); } catch (e) { /* noop */ }
  }

  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', (e) => {
      e.preventDefault();
      audio.unlock();
      if (game.state === 'TITLE') game.startNewGame();
      else game.onLaunch();
    });
  }

  const volSlider = document.getElementById('title-volume');
  if (volSlider) {
    volSlider.value = String(Math.round((audio._musicVolume ?? 0.6) * 100));
    volSlider.addEventListener('input', () => {
      const v = Number(volSlider.value) / 100;
      audio.setMusicVolume(v);
      try { localStorage.setItem(VOL_KEY, String(v)); } catch (e) { /* noop */ }
    });
  }
  const muteCb = document.getElementById('title-mute');
  if (muteCb) {
    muteCb.checked = savedMute;
    muteCb.addEventListener('change', () => {
      audio.setMuted(muteCb.checked);
      persistMute();
    });
  }

  game.start();
  requestAnimationFrame(() => renderer._resize());
  startLoop(game);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
