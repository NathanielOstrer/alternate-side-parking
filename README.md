# NYC Alternate Side Parking

Mobile-first website to check NYC alternate side parking rules by street.

**Live site:** https://nathanielostrer.com/alternate-side-parking/

## What it does

- Search any NYC street by address or name (autocomplete via NYC Planning GeoSearch)
- Shows the street's weekly ASP cleaning schedule pulled live from NYC Open Data
- Status plate updates in real time: clear, in effect, or suspended
- Full 2026 suspension calendar (43 days including religious and cultural holidays)
- MapLibre GL JS map that flies to the searched street

## Data sources

- **Street search & geocoding:** [NYC Planning GeoSearch](https://geosearch.planninglabs.nyc/) — free, no auth
- **Parking sign data:** [NYC Open Data `nfid-uabd`](https://data.cityofnewyork.us/resource/nfid-uabd.json) — "Parking Regulation Locations and Signs", free, no auth
- **Map tiles:** [CARTO Positron](https://carto.com/basemaps/) via MapLibre GL JS
- **Suspension calendar:** NYC DOT 2026 ASP calendar, bundled as JSON in the page

## Stack

Single `index.html` — no build step, no framework, no dependencies to install. Just open the file or push to deploy.

## Hosting

Deployed via GitHub Pages. Since `NathanielOstrer.github.io` has a custom domain (`nathanielostrer.com`) pointing to it, every other repo with Pages enabled automatically gets a subpath under that domain:

```
nathanielostrer.com/               ← NathanielOstrer/NathanielOstrer.github.io
nathanielostrer.com/alternate-side-parking  ← this repo
nathanielostrer.com/other-project   ← any other repo with Pages enabled
```

To enable Pages on a repo: Settings → Pages → Source: main / `/(root)`. Or via CLI:

```bash
gh api --method POST repos/NathanielOstrer/<repo-name>/pages \
  -f "source[branch]=main" -f "source[path]=/"
```

Deploying an update is just:

```bash
git add -A && git commit -m "..." && git push
```
