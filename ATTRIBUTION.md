# Attribution

## Code

All game code is hand-written for this project. Vanilla HTML5 Canvas + JavaScript, no external runtime libraries.

## Sound Effects

All in-game sound effects (paddle hit, wall hit, brick hit, brick break, power-up, power-down, laser shoot, lose life, level clear, ball launch) are **synthesized at runtime via the Web Audio API** in [`src/audio.js`](src/audio.js). No external audio assets are required for SFX.

## Music

The game ships **without bundled music files**. The audio system is designed to degrade gracefully — if a music file is missing the game runs in silence with no errors.

To add background music, drop the following files into `assets/music/`:

| Filename        | Used for           |
|-----------------|--------------------|
| `title.mp3`     | Title screen       |
| `level-1.mp3`   | Level 1 — Welcome  |
| `level-2.mp3`   | Level 2 — Stripes  |
| `level-3.mp3`   | Level 3 — Pyramid  |
| `level-4.mp3`   | Level 4 — Pillars  |
| `level-5.mp3`   | Level 5 — Channels |
| `level-6.mp3`   | Level 6 — Wall     |
| `level-7.mp3`   | Level 7 — Diamond  |
| `level-8.mp3`   | Level 8 — Fortress |
| `victory.mp3`   | Victory screen     |

See [`assets/music/README.md`](assets/music/README.md) for verified royalty-free sources.

After adding music, **fill out the table below** with the actual track titles, artists, licenses, and source URLs you used:

| Filename        | Title | Artist | License | Source URL |
|-----------------|-------|--------|---------|------------|
| `title.mp3`     | _TODO_ | _TODO_ | _TODO_ | _TODO_ |
| `level-1.mp3`   | _TODO_ | _TODO_ | _TODO_ | _TODO_ |
| `level-2.mp3`   | _TODO_ | _TODO_ | _TODO_ | _TODO_ |
| `level-3.mp3`   | _TODO_ | _TODO_ | _TODO_ | _TODO_ |
| `level-4.mp3`   | _TODO_ | _TODO_ | _TODO_ | _TODO_ |
| `level-5.mp3`   | _TODO_ | _TODO_ | _TODO_ | _TODO_ |
| `level-6.mp3`   | _TODO_ | _TODO_ | _TODO_ | _TODO_ |
| `level-7.mp3`   | _TODO_ | _TODO_ | _TODO_ | _TODO_ |
| `level-8.mp3`   | _TODO_ | _TODO_ | _TODO_ | _TODO_ |
| `victory.mp3`   | _TODO_ | _TODO_ | _TODO_ | _TODO_ |

## Fonts

The game uses the system monospace font stack (`Courier New, ui-monospace, monospace`). No external font files.
