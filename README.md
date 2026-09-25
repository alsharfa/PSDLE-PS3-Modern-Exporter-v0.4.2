# PSDLE PS3 Modern Exporter v0.4.2

A Windows tool for exporting PS3-era PlayStation Network entitlement/library metadata from your own PlayStation account and browsing it in a local PSDLE-style interface.

## Features

- Fetches PlayStation entitlements using the current NPSSO → OAuth authorization-code flow.
- Uses .NET `HttpClient` for compatibility with Windows PowerShell 5.1 and PowerShell 7.
- Filters legacy PS3 DRM entries using `platformIds = 2147483648` and `downloadType = 0`.
- Shows title, Content ID, publisher, package size, activation date, Product ID, SKU, entitlement and DRM details.
- Shows package/content URLs only when Sony includes them in the entitlement data.
- Search, sortable columns, publisher and size filters, pagination, light/dark theme and summary statistics.
- Exports CSV, normalized JSON and raw entitlement JSON.

## Usage

1. Sign in at `https://www.playstation.com/` in your normal browser.
2. In the same browser open `https://ca.account.sony.com/api/v1/ssocookie`.
3. Copy the fresh `npsso` value. Treat it like a session credential and never share it.
4. Run `Run-PSDLE-PS3.cmd`.
5. Paste the NPSSO into the PowerShell window. Input is hidden.
6. The tool fetches the account entitlements and opens `viewer.html` automatically.
7. Use the viewer to search, inspect and export the PS3 library.

## Output

- `exports/psn-entitlements-YYYY-MM-DD-HHMMSS.json` — raw entitlement backup.
- `viewer-data.js` — current local viewer data loaded by the HTML viewer.

## Security

- NPSSO is held only in process memory and is not written to disk.
- OAuth access tokens are not written to disk.
- `viewer-data.js` and files in `exports/` contain account/library metadata and should be treated as private.

## v0.4.2

- Redesigned PSDLE-style viewer with dashboard statistics, improved filtering, sorting, pagination and per-item actions.
- Fixed Sony authorization and entitlement URL construction so PowerShell cannot interpret them as relative URIs.
- Corrected package version strings to `0.4.2`.
