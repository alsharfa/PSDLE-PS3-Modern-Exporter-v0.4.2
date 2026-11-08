# PSDLE PS3 & PS Vita Exporter v0.5.1

A Windows tool for exporting PS3 and PS Vita PlayStation Network entitlement/library metadata from your own account and browsing it in a local PSDLE-style interface.

## Supported platforms

- PS3
- PS Vita

## Features

- Uses the current NPSSO → OAuth authorization-code flow.
- Uses .NET `HttpClient` for Windows PowerShell 5.1 and PowerShell 7 compatibility.
- Keeps the working v0.4.x authentication path unchanged.
- Uses the original PSDLE-style legacy platform bit flags:
  - PS3: `2147483648`
  - PS Vita: `134217728`
- Uses bit-mask matching rather than exact equality, so cross-buy entries can correctly show more than one supported platform.
- Legacy downloadable entries are selected with `downloadType = 0`.
- Platform tabs: All / PS3 / PS Vita.
- Search, publisher and size filters, package-URL-only filter, sorting and pagination.
- Displays title, platform, Content ID, Product ID, SKU, publisher, package size, active date and DRM metadata.
- Shows package/content URLs only when Sony includes them in the entitlement response.
- Exports the current filtered view to CSV or JSON, plus raw entitlement JSON.

## Usage

1. Sign in at `https://www.playstation.com/` in your normal browser.
2. In the same browser open `https://ca.account.sony.com/api/v1/ssocookie`.
3. Copy the fresh `npsso` value. Treat it like a session credential and never share it.
4. Run `Run-PSDLE.cmd`.
5. Paste the NPSSO into the PowerShell window. Input is hidden.
6. The tool fetches the account entitlements and opens `viewer.html`.
7. Choose All / PS3 / PS Vita and export the view you want.

## Output

- `exports/psn-entitlements-YYYY-MM-DD-HHMMSS.json` — raw entitlement backup.
- `viewer-data.js` — current local viewer data loaded by the HTML viewer.

## Security

- NPSSO is held only in process memory and is not written to disk.
- OAuth access tokens are not written to disk.
- `viewer-data.js` and files in `exports/` contain account/library metadata and should be treated as private.

## v0.5.1

- Removed PS4 support.
- Removed PS5 support.
- Kept PS3 and PS Vita only.
- Retained cross-buy bit-mask detection.
- Kept direct legacy `contentUrl` package links where Sony exposes them.
