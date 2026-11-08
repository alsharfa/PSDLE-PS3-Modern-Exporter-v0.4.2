PSDLE PlayStation Library Exporter v0.5.0
===========================================

SUPPORTED PLATFORMS
- PS3
- PS Vita
- PS4
- PS5

HOW TO USE
1. Sign in at https://www.playstation.com/ in your normal browser.
2. In the SAME browser open https://ca.account.sony.com/api/v1/ssocookie
3. Copy the NEW npsso value. Never share it; it acts like a session credential.
4. Double-click Run-PSDLE.cmd
5. Paste the NPSSO into the PowerShell window (input is hidden) and press Enter.
6. The tool fetches your entitlements and opens viewer.html automatically.
7. Select All / PS3 / PS Vita / PS4 / PS5 in the viewer.
8. Export the current filtered view as CSV or JSON.

PLATFORM DETECTION
Legacy:
- PS3 platform bit: 2147483648
- PS Vita platform bit: 134217728
- Legacy downloadable entries use downloadType = 0.
- Platform values are treated as bit flags, so cross-buy entries can show multiple platforms.

Modern:
- PS4 uses PS4* package metadata such as PS4GD.
- PS5 uses PS5* / PSGD-style package metadata.
- CUSA and PPSA title IDs are used as fallbacks if package type metadata is missing.

PACKAGE URLS
Package/content URLs are shown only when Sony exposes them in the entitlement response.
PS4/PS5 entries may have library metadata without a direct package URL.

OUTPUT
- exports\psn-entitlements-YYYY-MM-DD-HHMMSS.json : raw entitlement backup
- viewer-data.js : current local viewer data

SECURITY
- NPSSO is held only in process memory and is not written to disk.
- OAuth access tokens are not written to disk.
- viewer-data.js and exports contain entitlement/library metadata, so treat them as account-private files.

v0.5.0
- Added PS Vita, PS4 and PS5.
- Added platform tabs, badges and platform-specific exports.
- Improved cross-buy legacy detection using bit masks.
- Added modern PS4/PS5 package-type and CUSA/PPSA fallbacks.
- Added Run-PSDLE.cmd. The old Run-PSDLE-PS3.cmd remains as a compatibility launcher.
