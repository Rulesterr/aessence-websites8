# Rino's Study Companion 💜

A calm, single-page **study aid** built with plain HTML, CSS, and vanilla
JavaScript — no build step, no dependencies. Designed around a soft lavender &
lilac theme for a focused, encouraging study experience.

> Greeting: **Hello, Rino!**

## Features

- **Tokyo clock & date** — live, ticking every second (`Asia/Tokyo`), with a
  time-aware greeting subtitle.
- **Live weather** — current temperature, condition, and humidity for Tokyo,
  plus a 3-day forecast. Data from the free, key-less
  [Open-Meteo](https://open-meteo.com/) API (refreshes every 10 minutes).
- **To-do list** — add, check off, and delete tasks. Sits right under the title.
- **Customizable Pomodoro** — enter the total time you'd like to study, get a
  **suggested schedule**, then freely tweak focus length, break length, and
  number of cycles. A visual timeline previews the session.
- **Focus timer** — a large circular countdown that runs the full focus/break
  sequence, shifting color between focus (lilac) and break (mint), with a gentle
  chime and a little celebration when you finish.
- **Progress graph** — a ring + bar comparing time **studied** against your
  **planned** total, with encouraging affirmations along the way.
- **Bilingual (EN / 日本語)** — a language switch in the greeting card localizes
  the whole study page, including the Tokyo date and weather, and remembers your
  choice in `localStorage`.
- **Persistence** — to-dos, settings, and accumulated study time are saved to
  `localStorage`, so they survive refreshes and return visits.
- **Accessible & comfortable** — keyboard-operable, AA-minded contrast,
  `prefers-reduced-motion` support.

## Calendar 📅

A self-contained, Apple-Calendar-style calendar lives at **`calendar.html`**.
The study page's header shows a **mini-month card** next to the Tokyo card
(today highlighted, dots on days with events); clicking a day opens the full
calendar on that date via a `#YYYY-MM-DD` hash. No external API or backend —
everything is stored in `localStorage`. The calendar is also **bilingual
(EN / 日本語)** and shares the language preference with the study page.

- **Month / Week / Day** views with a view switcher and Today / prev / next nav.
- **Create, edit, and delete events** via a dialog — title, all-day or timed,
  start/end, location, and notes.
- **Multiple color-coded calendars** (Personal, Study, Exams by default); add
  your own, and toggle each one's visibility.
- **Recurring events** — daily, weekly, monthly, or yearly, expanded across views.
- **Search** events by title, location, or notes.
- **Mini month calendar** in the sidebar for quick navigation.
- Overlapping events are laid out side-by-side; a live "now" line marks the
  current time in Week/Day views.

## Structure

```
.
├── index.html           # Study companion (the one-pager)
├── calendar.html        # Full calendar app
├── css/
│   ├── styles.css        # Lavender theme + study page; design tokens
│   └── calendar.css      # Calendar layout & views
└── js/
    ├── app.js            # Clock, weather, to-dos, Pomodoro, progress
    └── calendar.js       # Calendar: views, events, recurrence, search
```

## Running locally

It's a static site. Serving over HTTP is recommended (the weather `fetch`
behaves best over `http://` rather than `file://`):

```bash
# Python 3
python3 -m http.server 8000
# or Node
npx serve .
```

Then open <http://localhost:8000>. **Network access is required** for live
weather and Google Fonts; everything else works offline.

## Customizing

- **Theme** — edit the CSS variables in `:root` at the top of `css/styles.css`.
- **Location** — change the `latitude`/`longitude` in `loadWeather()` and the
  `timeZone` in `js/app.js` to study from somewhere else.
- **Defaults** — adjust the default Pomodoro settings in `loadState()`.

## License

MIT — see [LICENSE](LICENSE).
