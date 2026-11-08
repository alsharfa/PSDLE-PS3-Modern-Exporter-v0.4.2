PSDLE PS3 & PS Vita Exporter v0.5.1
=====================================

SUPPORTED PLATFORMS
- PS3
- PS Vita

HOW TO USE
1. Sign in at https://www.playstation.com/ in your normal browser.
2. In the SAME browser open https://ca.account.sony.com/api/v1/ssocookie
3. Copy the NEW npsso value. Never share it; it acts like a session credential.
4. Double-click Run-PSDLE.cmd
5. Paste the NPSSO into the PowerShell window (input is hidden) and press Enter.
6. The tool fetches your entitlements and opens viewer.html automatically.
7. Select All / PS3 / PS Vita.
8. Export the current filtered view as CSV or JSON.

PLATFORM DETECTION
- PS3 platform bit: 2147483648
- PS Vita platform bit: 134217728
- Legacy downloadable entries use downloadType = 0.
- Platform values are treated as bit flags, so cross-buy entries can show multiple supported platforms.

PACKAGE URLS
Package/content URLs are shown when Sony exposes the legacy contentUrl field.

OUTPUT
- exports\psn-entitlements-YYYY-MM-DD-HHMMSS.json : raw entitlement backup
- viewer-data.js : current local viewer data

SECURITY
- NPSSO is held only in process memory and is not written to disk.
- OAuth access tokens are not written to disk.
- viewer-data.js and exports contain entitlement/library metadata, so treat them as account-private files.

v0.5.1
- Removed PS4.
- Removed PS5.
- Kept PS3 and PS Vita only.
- Retained cross-buy bit-mask detection and legacy package URL support.
