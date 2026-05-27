# Music — sourcing guide

The game looks for these 10 files in this folder. If a file is missing the game still runs (silently for that track), so you can add tracks one at a time.

```
title.mp3
level-1.mp3
level-2.mp3
level-3.mp3
level-4.mp3
level-5.mp3
level-6.mp3
level-7.mp3
level-8.mp3
victory.mp3
```

Music tracks should ideally be:
- Short (1–3 minutes), loop-friendly.
- Chiptune / 8-bit / arcade in style — fits the brick-breaker theme.
- Royalty-free with a license that allows redistribution and (if you ship the game commercially) commercial use.

## Recommended sources

These are well-known, verifiable royalty-free music sources. Pick tracks that fit each level's escalating intensity (calm → tense for level 8).

### CC0 (public-domain equivalent — no attribution required)

- **Juhani Junkala — "Retro Game Music Pack"** on OpenGameArt — five short chiptune loops, CC0. Perfect fit. https://opengameart.org/content/5-chiptunes-action
- **Visager — "Songs from an Unmade World" series** on Free Music Archive — many CC0 chiptune tracks. https://freemusicarchive.org/music/Visager
- **OpenGameArt — Music tag, sorted by license** — filter to CC0 for ready-to-ship tracks. https://opengameart.org/art-search-advanced?keys=&field_art_type_tid%5B%5D=12

### CC-BY 4.0 (free to use commercially, attribution required)

- **Eric Matyas — Soundimage.org** — large library of free chiptune / arcade music, attribution required. https://soundimage.org/chiptune-music/
- **Kevin MacLeod — Incompetech** — vast free library, CC-BY 4.0. Search "8-bit" or "chiptune". https://incompetech.com/music/royalty-free/

### Pixabay license (free for commercial use, attribution not required)

- **Pixabay — 8-bit music search** — https://pixabay.com/music/search/8-bit/
- **Pixabay — arcade music search** — https://pixabay.com/music/search/arcade/

## After downloading

1. Rename each file to match the names above (e.g. `title.mp3`, `level-1.mp3`).
2. If a track is too long, trim it with [Audacity](https://www.audacityteam.org/) (free, open-source) and export back to MP3.
3. Update the credits table in [`/ATTRIBUTION.md`](../../ATTRIBUTION.md) with the title, artist, license, and source URL for every track you add — even CC0 tracks (it helps future contributors verify provenance).
4. Reload the game; the music will play automatically once you click "Start" or press Space (browsers require a user gesture before audio can begin).
