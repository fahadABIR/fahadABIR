# fahadABIR — Portfolio

Single-file static site. Just upload the contents of this folder to your repo / static host.

## Files

```
index.html          # the entire site (HTML + CSS + JS inline)
assets/
  work.jpg          # Story 1 photo (chalet)
  work2.jpg         # Story 2 photo (ski slope)
```

## Deploy

Any static host works (GitHub Pages, Netlify, Vercel, Cloudflare Pages, S3, plain web server). No build step.

- **GitHub Pages**: push to a repo, enable Pages on the branch root.
- **Netlify / Vercel**: drag-and-drop this folder, or connect the repo. No build command, publish directory = root.
- **Local preview**: just open `index.html` in a browser, or run `python3 -m http.server` from this folder.

## Edit notes

- All photos live in `assets/`. To swap them, replace the files (keep the names) or update the `background-image:url('assets/...')` references in `index.html`.
- Story metadata (title, location, EXIF, blurb) is the `storyDetails` object inside the `<script>` near the bottom of `index.html`.
- Blog cards are static `<article class="blog-card">` blocks in the Blog section — edit the markup directly.
- Social links are in the Contact section (Instagram / Facebook / website `<a>` tags).
- Hero coordinates are the `LAT` / `LON` constants in the `heroCoordsTyper` IIFE at the bottom of the script.
