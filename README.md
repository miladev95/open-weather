# Open Weather (Chrome Extension)

Small Chrome extension that fetches current weather for a city using free public APIs (Nominatim for geocoding and Open-Meteo for weather) — no API key required.

Files
- `manifest.json` - Chrome extension manifest (MV3).
- `popup.html` - Popup UI.
- `popup.js` - Fetch logic, UI updates, storage of last city (uses Nominatim + Open-Meteo).
- `styles.css` - Popup styling.

Setup
1. Open chrome://extensions, enable Developer mode.
2. Click "Load unpacked" and select this folder (`/home/milad/Programming/Chrome-Ext/open-weather`).
3. Click the extension icon and enter a city name to fetch weather.

Notes
- This extension uses only free APIs and doesn't require an API key:
  - Geocoding: https://nominatim.openstreetmap.org (OpenStreetMap Nominatim)
  - Weather: https://open-meteo.com (Open-Meteo current_weather)
- Nominatim asks that you include a valid User-Agent header and avoid excessive automated requests.
