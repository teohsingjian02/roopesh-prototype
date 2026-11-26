# Roopesh Sitharan: website prototype

A portfolio and introduction site for Ts. Dr. Roopesh Sitharan, artist, curator, researcher and educator.

Live prototype: https://teohsingjian02.github.io/roopesh-prototype/

The idea comes from his own phrase, *in-between language and art* (his 2020 paper *ANTARA*). Words are the main
material: a monochrome page, classic and strong, set in Gyre Adventor Bold (a free relative of the 1970s classic ITC
Avant Garde Gothic) with Roboto for reading.

- **Loading, then an opening.** A visitor who arrives from outside the site sees his name set letter by letter as the
  page loads. Then *language* and *art* appear on two black curtains with a seam between them, and the curtains part on
  the page. Any key, click, touch or scroll skips it. Moving between pages of the site does not play it again. Nothing
  is stored to decide this: the page only looks at where the visitor came from (`document.referrer`).
- **Slow, smooth motion that is always on.**
  - The page glides when scrolled with a mouse wheel; touch scrolling stays native.
  - Links within a page travel with a slow, classical ease.
  - Content rises in from whichever side you scroll from, and big titles rise letter by letter.
  - Pictures drift as you scroll.
  - The statement takes the ink word by word as it is read.
- **Small serious games.**
  - The words *artist, curator, researcher, educator* open a line each.
  - *between language & art* turns through other pairs from his work, each linked to where it comes from.
  - Letters of his name lift towards the pointer.
  - A small ink dot trails the cursor.
- **The portrait** is a black and white rectangle cut into six strips that rise into place, slip slightly all the time
  and part on hover.

Every page also reads without JavaScript. All search engines are asked not to index the prototype.

## Pages

| Path | What is on it |
|---|---|
| `/` | Name and portrait, roles, *between*, his statement, the latest notes, selected writing, current positions |
| `/notes/` | Talks, panels, exhibitions and publications, newest first, mostly in his own words, with a contents list |
| `/writing/` | 24 publications grouped by year, with filters (articles, chapters, conference papers, other) |
| `/about/` | Biography, positions and education |
| every page | *Correspondence*: links to LinkedIn, Instagram, ORCID, ResearchGate, Academia, Semantic Scholar, New Media Caucus and APARN |

## What is here

| Path | What it holds |
|---|---|
| `content/profile.json` | Name, roles, the *between* pairs, statement, biography, positions, education, links |
| `content/notes.json` | The notes (texts, dates, places, images, videos) |
| `content/writing.json` | The publications |
| `content/media.json` | Image and video sizes (written by `tools/make-media.mjs`) |
| `src/pages.mjs` | Page templates |
| `src/site.css`, `src/site.js` | Style and motion |
| `src/build.mjs` | Builds `docs/` and checks links, anchors, noindex, alt text, one h1 per page and no em dashes |
| `static/` | Fonts, web-sized images and video clips |
| `docs/` | The built site, which GitHub Pages serves (branch `main`, folder `/docs`) |
| `tools/` | Media maker, font fetcher, local server, browser tests and screenshots |

## Build, preview, test

You need Node.js 22 or later, and Google Chrome for the tests and screenshots.

```
node src/build.mjs                 # writes docs/ and checks it
node tools/serve.mjs               # http://127.0.0.1:8161/roopesh-prototype/
node tools/test-site.mjs           # every page at 360, 768 and 1440 px, plus the opening, the games, filters and menu
node tools/test-site.mjs --shots   # the same, then screenshots in screenshots/
node tools/test-site.mjs --live    # the same tests against the published site
```

To change a photo or add one, put it in the source folder, map it in `tools/make-media.mjs` and run
`node tools/make-media.mjs "<source folder>"`. It makes WebP copies at several widths with headless Chrome.

## Fonts

- **Gyre Adventor** is a Latin subset of TeX Gyre Adventor (GUST e-foundry), GUST Font License, see
  `static/fonts/GUST-FONT-LICENSE.txt`. The subset has its own family name, as the licence requests.
- **Roboto** comes from Google Fonts (SIL Open Font License 1.1).
- **ITC Avant Garde Gothic** (the files in the supplied `Font` folder) is a commercial Monotype typeface. It is not
  published here, because putting it on a public website needs a web font licence. If Roopesh holds one, convert
  the files to WOFF2, add them to `static/fonts/`, and put the family first in `--display` in `src/site.css`.

## To confirm before launch

1. Which email address to publish, if any (the site now links to his profiles only).
2. Dates for the Lawangwangi panel, the Co-LuminaX panel and the Vietnam Festival of Creativity and Design exhibition (only the year, or no date, is given in the notes).
3. Photo credits (only the *Who Speaks?* photographs carry a credit, Arron Teo) and permission to use each photo and the two poster clips.
4. The statement and biography wording, and the *between* pairs on the home page.
5. The Chapalang note, which comes from APARN's January 2026 newsletter rather than the supplied notes.
6. Publications: the retracted Soft Computing article and its retraction note are left out on purpose, with a duplicate entry and a front-matter page.
7. Before going live at roopesh.com: remove the `noindex` tags, point the domain at the host, and add an artwork section once images of his own works are available.
