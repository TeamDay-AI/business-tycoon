// ═══════════════════════════════════════════════════════════════
//  BUSINESS TYCOON — Audio (BGM playlist with shuffle)
// ═══════════════════════════════════════════════════════════════

const TRACKS = [
  './assets/office-bgm.mp3',
  './assets/jazz-bgm.mp3',
  './assets/chill-lobby-bgm.mp3',
  './assets/transport-bgm.mp3',
];

let bgm = null;
let playing = false;
let volume = 0.3;
let initialized = false;
let trackIndex = -1;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

let playlist = [];

function nextTrack() {
  // Refill shuffled playlist when exhausted
  if (playlist.length === 0) {
    playlist = shuffle([...TRACKS]);
    // Avoid repeating the same track across refills
    if (playlist[0] === bgm?.src?.split('/').slice(-2).join('/')) {
      const last = playlist.pop();
      playlist.unshift(last);
    }
  }
  return playlist.shift();
}

function loadTrack(src) {
  if (bgm) {
    bgm.pause();
    bgm.removeEventListener('ended', onTrackEnd);
  }
  bgm = new Audio(src);
  bgm.volume = volume;
  bgm.addEventListener('ended', onTrackEnd);
}

function onTrackEnd() {
  if (!playing) return;
  loadTrack(nextTrack());
  bgm.play().catch(() => {});
}

export function initAudio() {
  loadTrack(nextTrack());

  // Start on first user interaction
  const start = () => {
    if (!initialized) {
      initialized = true;
      bgm.play().catch(() => {});
      playing = true;
      document.removeEventListener('click', start);
      document.removeEventListener('keydown', start);
    }
  };
  document.addEventListener('click', start);
  document.addEventListener('keydown', start);
}

export function toggleMusic() {
  if (!bgm) return;
  if (playing) {
    bgm.pause();
    playing = false;
  } else {
    bgm.play().catch(() => {});
    playing = true;
  }
  return playing;
}

export function setVolume(v) {
  volume = Math.max(0, Math.min(1, v));
  if (bgm) bgm.volume = volume;
}

export function getVolume() { return volume; }
export function isPlaying() { return playing; }
