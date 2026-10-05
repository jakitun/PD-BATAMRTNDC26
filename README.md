# Prime Darts — league website prototype

Static HTML, CSS and JavaScript. No build step, package installation, server database or credentials in the public site.

## Preview

Serve this folder using a local HTTP server. Open index.html through that server, not file:// (the browser needs to fetch data.json).

The bundled Stage 1 data contains 16 players, 15 matches, 37 actual legs and 40 individual placement points. Luis's 3.16 MPR is explicitly provisional. Rankings currently use placement points only, retaining shared ranks. This is a prototype and does not change league rules.

## GitHub Pages

1. Put index.html, style.css, app.js, config.js and data.json at the root of a repository.
2. In repository Settings → Pages, select Deploy from a branch, main, /(root).
3. Open the resulting Pages URL. Relative asset paths support both project and root sites.

Repository: https://github.com/jakitun/PD-BATAMRTNDC26

GitHub Pages URL: https://jakitun.github.io/PD-BATAMRTNDC26/

The site initially uses the checked Stage 1 snapshot. Sheets sync requires the setup below.

## Connect the existing private Google Sheet (one-time setup)

1. From the existing League Tracker, open Extensions → Apps Script.
2. Add sheets-bridge.gs. The script reads only Stage results and Leg log; it never reads Payment. Review the allowlisted public fields before deploying.
3. In Apps Script Project Settings → Script properties, add PUBLISHED_STAGES with value 1. Later change to 1,2, etc. when each stage is ready for players. An empty value publishes no stages.
4. Deploy → New deployment → Web app. Execute as yourself; access Anyone. Authorize the Sheet read access. This publicly exposes only the exported player names, results and stats; it does not publish the underlying spreadsheet.
5. Paste the deployment's /exec URL into feedUrl in config.js and publish that one file to Pages.
6. Confirm in a private browser window that results load and the status says Sheets connected. Verify the browser's JSON response contains only intended public fields. The bridge and cross-origin connection have not been live-deployed/tested in this prototype.

Published stage data refreshes when the page opens and every five minutes while open. Changes to those stages in Sheets need no website deployment. A failed feed falls back to the dated Stage 1 preview and clearly labels that state. No passwords, service-account keys, or access tokens belong in config.js or the repository.

updatedAt is the feed retrieval time, not the time of the last spreadsheet edit. Saved preview time is the source snapshot date. PPD/MPR are simple recorded-leg means, not dart-weighted performance ratings. 701 PPR is intentionally unsupported by this first prototype rather than silently mixed into PPD.

## Implementation notes

- Player names and sheet values are escaped before rendering.
- Match scores count one pair's leg records, so opposing logs do not double-count the match.
- Provisional status is read from stat-cell PROVISIONAL notes where present, otherwise both players in a pending pair row are flagged conservatively.
- Schedule dates are fixed to the agreed six stages; the next-stage card uses Jakarta's date.
- Display fonts load from Google Fonts; local fallback fonts are available.
- Browser checks cover search, profile modal, stage results, mobile overflow, and Stage 1 numerical totals.
