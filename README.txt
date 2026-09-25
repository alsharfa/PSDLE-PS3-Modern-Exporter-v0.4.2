PSDLE PS3 Modern Exporter v0.4.2
================================

WHAT CHANGED IN v0.4
- Replaced the OAuth Invoke-WebRequest path with .NET HttpClient.
- Works with the built-in Windows PowerShell 5.1 redirect behavior as well as PowerShell 7.
- Keeps redirects disabled so Sony's custom PlayStation redirect URI can be read directly.
- Uses the current PSN authorization request metadata and correlation ID flow.
- Improved authentication diagnostics: HTTP status, Sony error code and redirect details.

HOW TO USE
1. Sign in at https://www.playstation.com/ in your normal browser.
2. In the SAME browser open https://ca.account.sony.com/api/v1/ssocookie
3. Copy the NEW npsso value. Never share it; it acts like a session credential.
4. Double-click Run-PSDLE-PS3.cmd
5. Paste the NPSSO into the PowerShell window (input is hidden) and press Enter.
6. The tool fetches your entitlements and opens viewer.html automatically.
7. Use Export CSV / Export JSON in the viewer.

OUTPUT
- exports\psn-entitlements-YYYY-MM-DD-HHMMSS.json : raw entitlement backup
- viewer-data.js : current local viewer data

SECURITY
- NPSSO is held only in process memory and is not written to disk.
- OAuth access tokens are not written to disk.
- viewer-data.js and exports contain entitlement/library metadata, so treat them as account-private files.

PS3 FILTER
Strict legacy PS3 DRM entries are selected when:
- platformIds = 2147483648
- downloadType = 0

Package/content URLs are shown only when Sony includes them in the entitlement data.

v0.4.2
- Redesigned the PSDLE-style viewer with dashboard statistics, filters, sorting, pagination and item actions.
- Builds Sony authorization and entitlement request URLs explicitly as absolute URIs.
- Fixes Windows PowerShell parsing that could turn the authorization URL into a relative URI.
- Corrected internal version strings to v0.4.2.
