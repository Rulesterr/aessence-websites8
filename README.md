# Aessence

A clean, responsive **static website** for Aessence — a fictional botanical essentials brand. Built with plain HTML, CSS, and vanilla JavaScript. No build step, no dependencies.

## Pages

| Page | File | Description |
|------|------|-------------|
| Home | `index.html` | Hero, brand pillars, and story teaser |
| About | `about.html` | Brand story and values |
| Products | `products.html` | Collection grid (rendered from data in `js/main.js`) |
| Contact | `contact.html` | Validated contact form + studio details |

## Structure

```
.
├── index.html
├── about.html
├── products.html
├── contact.html
├── css/
│   └── styles.css      # All styling, design tokens via CSS variables
└── js/
    └── main.js         # Nav toggle, scroll reveal, product list, form validation
```

## Running locally

It's a static site, so just open `index.html` in a browser. For nav/asset
paths to behave consistently, serving over HTTP is recommended:

```bash
# Python 3
python3 -m http.server 8000

# or Node
npx serve .
```

Then visit <http://localhost:8000>.

## Customizing

- **Colors & spacing** — edit the CSS variables in `:root` at the top of `css/styles.css`.
- **Products** — edit the `products` array in `js/main.js`.
- **Copy** — text lives directly in the HTML files.

## Notes

- The contact form is client-side only; wire `js/main.js` up to a backend or
  form service (Formspree, Netlify Forms, etc.) to receive submissions.
- Fonts are loaded from Google Fonts (Cormorant Garamond + Inter).

## License

MIT — see [LICENSE](LICENSE).
