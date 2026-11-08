# PSDLE PlayStation Library Exporter v0.5.0

A Windows tool for exporting PlayStation Network entitlement/library metadata from your own account and browsing it in a local PSDLE-style interface.

## Supported platforms

- PS3
- PS Vita
- PS4
- PS5

## Features

- Uses the current NPSSO → OAuth authorization-code flow.
- Uses .NET `HttpClient` for Windows PowerShell 5.1 and PowerShell 7 compatibility.
- Keeps the working v0.4.x authentication path unchanged.
- Legacy PS3/Vita detection uses PSDLE-style platform bit flags:
  - PS3: `2147483648`
  - PS Vita: `134217728`
- Modern PS4/PS5 detection uses entitlement/package metadata:
  - PS4: `PS4*` package types such as `PS4GD`
  - PS5: `PS5*` and `PSGD`-style types
  - CUSA/PPSA title-ID fallbacks when package type metadata is absent
- Cross-buy legacy entries can show multiple platforms.
- Platform tabs: All / PS3 / PS Vita / PS4 / PS5.
- Search, publisher and size filters, package-URL-only filter, sorting and pagination.
- Displays title, platform, Content ID, Title ID, Product ID, SKU, publisher, package type, size, active date and entitlement metadata.
- Shows package/content URLs only when Sony exposes them in the entitlement response.
- Exports the current filtered view to CSV or JSON, plus raw entitlement JSON.

## Usage

1. Sign in at `https://www.playstation.com/` in your normal browser.
2. In the same browser open `https://ca.account.sony.com/api/v1/ssocookie`.
3. Copy the fresh `npsso` value. Treat it like a session credential and never share it.
4. Run `Run-PSDLE.cmd`.
5. Paste the NPSSO into the PowerShell window. Input is hidden.
6. The tool fetches the account entitlements and opens `viewer.html`.
7. Choose All / PS3 / PS Vita / PS4 / PS5 and export the view you want.

## Output

- `exports/psn-entitlements-YYYY-MM-DD-HHMMSS.json` — raw entitlement backup.
- `viewer-data.js` — current local viewer data loaded by the HTML viewer.

## Security

- NPSSO is held only in process memory and is not written to disk.
- OAuth access tokens are not written to disk.
- `viewer-data.js` and files in `exports/` contain account/library metadata and should be treated as private.

## v0.5.0

- Added PS Vita.
- Added PS4.
- Added PS5.
- Added platform tabs, badges, counts and platform-specific exports.
- Changed legacy platform detection from exact equality to bit-mask matching, improving cross-buy handling.
- Added PS4/PS5 package-type and CUSA/PPSA classification fallbacks.
- Renamed the main launcher to `Run-PSDLE.cmd`; the old `Run-PSDLE-PS3.cmd` remains as a compatibility launcher.
