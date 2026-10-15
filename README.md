# ABY Go · All Before You Go

An all-in-one travel planner built with plain HTML, CSS and vanilla JavaScript.
Spin the globe, click a spot, pick the precise place, and see weather,
daylight times, destination info and currency conversion.

## Run it

**Active link (while the server is running):** http://localhost:8765

Start the server whenever you need it:

```bash
python3 -m http.server 8765 --directory .
```

Or in VS Code: **Terminal → Run Task… → "Serve Travel Buddy"** (it also
starts automatically when the folder opens, if you allow the task), then
**Run Task… → "Open Travel Buddy in browser"** — or just open the link above.

To view it inside VS Code itself: press `Cmd+Shift+P` → **Simple Browser: Show**
→ paste `http://localhost:8765`.

## Files

- `index.html` — page structure
- `style.css` — night-sky theme and card layout
- `script.js` — globe drawing, API calls, saved trips (heavily commented)
- `earth.jpg` — NASA "Blue Marble" satellite photo (public domain), painted onto the globe

## APIs used (all keyless)

- Open-Meteo Geocoding & Weather
- BigDataCloud reverse geocoding (globe clicks → nearby places)
- Sunrise-Sunset.org
- Wikipedia REST summary
- Frankfurter (currency)
