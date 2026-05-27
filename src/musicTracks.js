/** Scale-degree → frequency helpers for procedural chiptune loops. */

const MAJOR = [0, 2, 4, 5, 7, 9, 11];

export function degreeToFreq(rootHz, degree, octave = 0) {
  if (degree < 0) return 0;
  const idx = ((degree % 7) + 7) % 7;
  const oct = Math.floor(degree / 7) + octave;
  const semi = MAJOR[idx] + oct * 12;
  return rootHz * (2 ** (semi / 12));
}

/**
 * @typedef {object} MusicTrackDef
 * @property {number} bpm
 * @property {number} root root frequency (Hz)
 * @property {number[]} melody scale degrees per 16th, -1 = rest
 * @property {number[]} bass scale degrees per 8th (two 16ths each), -1 = rest
 * @property {number} [leadVol]
 * @property {number} [bassVol]
 */

/** @type {Record<string, MusicTrackDef>} */
export const MUSIC_TRACKS = {
  title: {
    bpm: 92,
    root: 220,
    melody: [0, -1, 4, -1, 5, 4, 2, 0, 2, -1, 5, -1, 7, 5, 4, 2],
    bass: [0, -1, -1, -1, 4, -1, -1, -1],
    leadVol: 0.055,
    bassVol: 0.075,
  },
  'level-1': {
    bpm: 118,
    root: 261.63,
    melody: [0, 2, 4, 7, 4, 2, 0, -1, 4, 5, 7, 5, 4, 2, 0, -1],
    bass: [0, -1, 4, -1, 5, -1, 4, -1],
    leadVol: 0.06,
    bassVol: 0.08,
  },
  'level-2': {
    bpm: 122,
    root: 293.66,
    melody: [2, 4, 5, 7, 9, 7, 5, 4, 2, 4, 5, 4, 2, 0, 2, 4],
    bass: [0, -1, 2, -1, 4, -1, 2, -1],
    leadVol: 0.06,
    bassVol: 0.082,
  },
  'level-3': {
    bpm: 126,
    root: 329.63,
    melody: [4, 5, 7, 9, 7, 5, 4, 2, 4, 5, 7, 5, 4, 2, 0, -1],
    bass: [0, -1, 4, -1, 0, -1, 5, -1],
    leadVol: 0.062,
    bassVol: 0.084,
  },
  'level-4': {
    bpm: 128,
    root: 349.23,
    melody: [0, 4, 7, 4, 0, -1, 2, 5, 7, 5, 2, 0, -1, 4, 7, 9],
    bass: [0, -1, 5, -1, 4, -1, 0, -1],
    leadVol: 0.063,
    bassVol: 0.085,
  },
  'level-5': {
    bpm: 132,
    root: 392,
    melody: [7, 5, 4, 2, 0, 2, 4, 5, 7, 9, 7, 5, 4, 2, 4, 5],
    bass: [0, -1, 4, -1, 2, -1, 5, -1],
    leadVol: 0.065,
    bassVol: 0.087,
  },
  'level-6': {
    bpm: 136,
    root: 440,
    melody: [0, 2, 4, 7, 11, 9, 7, 4, 2, 4, 7, 4, 2, 0, -1, 4],
    bass: [0, -1, 5, -1, 4, -1, 0, -1],
    leadVol: 0.066,
    bassVol: 0.088,
  },
  'level-7': {
    bpm: 140,
    root: 493.88,
    melody: [4, 7, 11, 9, 7, 4, 2, 0, 4, 5, 7, 9, 7, 5, 4, 2],
    bass: [0, -1, 4, -1, 2, -1, 6, -1],
    leadVol: 0.068,
    bassVol: 0.09,
  },
  'level-8': {
    bpm: 148,
    root: 523.25,
    melody: [0, 4, 7, 11, 14, 11, 7, 4, 0, 4, 7, 4, 2, 0, -1, 7],
    bass: [0, -1, 5, -1, 3, -1, 7, -1],
    leadVol: 0.07,
    bassVol: 0.092,
  },
  victory: {
    bpm: 132,
    root: 261.63,
    melody: [0, 4, 7, 12, 7, 4, 0, -1, 2, 5, 9, 14, 9, 5, 2, -1],
    bass: [0, -1, 4, -1, 7, -1, 4, -1],
    leadVol: 0.07,
    bassVol: 0.085,
  },
};
