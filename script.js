/* ------------------------------------------------------------
   CRASH REPORTER
   If any JavaScript error slips through, show it in a red banner
   at the top of the page instead of freezing silently — so you
   always know WHAT broke and WHERE.
   ------------------------------------------------------------ */
window.addEventListener("error", function (event) {
  const banner = document.createElement("div");
  banner.style.cssText =
    "position:fixed; top:0; left:0; right:0; z-index:9999;" +
    "background:#b91c1c; color:#fff; padding:10px 16px;" +
    "font:13px monospace; white-space:pre-wrap;";
  banner.textContent =
    "⚠️ JavaScript error: " + event.message +
    "  (" + (event.filename || "").split("/").pop() + ":" + event.lineno + ")" +
    "\nTry a hard refresh: Cmd+Shift+R";
  document.body.appendChild(banner);
});

const globeCanvas = document.getElementById("globe");
const globeCtx = globeCanvas.getContext("2d");

const statusMessage = document.getElementById("status-message");
const navBackButton = document.getElementById("nav-back");
const heroTitle = document.getElementById("hero-title");
const heroSubtitle = document.getElementById("hero-subtitle");
const heroHint = document.getElementById("hero-hint");
const planeOverlay = document.getElementById("plane-overlay");
const planeElement = document.getElementById("plane");

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const suggestionsBox = document.getElementById("suggestions");
const suggestionsTitle = document.getElementById("suggestions-title");
const suggestionButtons = document.getElementById("suggestion-buttons");

const destinationHeader = document.getElementById("destination-header");
const destinationCity = document.getElementById("destination-city");
const destinationCountry = document.getElementById("destination-country");
const saveButton = document.getElementById("save-button");

const cardsSection = document.getElementById("cards");
const weatherContent = document.getElementById("weather-content");
const sunContent = document.getElementById("sun-content");
const wikiContent = document.getElementById("wiki-content");

const amountInput = document.getElementById("amount-input");
const fromCurrency = document.getElementById("from-currency");
const toCurrency = document.getElementById("to-currency");
const convertButton = document.getElementById("convert-button");
const convertResult = document.getElementById("convert-result");

const emergencyContent = document.getElementById("emergency-content");
const timezoneContent = document.getElementById("timezone-content");
const distanceContent = document.getElementById("distance-content");
const homeInput = document.getElementById("home-input");
const homeButton = document.getElementById("home-button");

const exploreSection = document.getElementById("explore-section");
const exploreCity = document.getElementById("explore-city");
const exploreGrid = document.getElementById("explore-grid");
const exploreNote = document.getElementById("explore-note");

const savedList = document.getElementById("saved-list");
const noSavedMessage = document.getElementById("no-saved-message");

// The app has two steps: first the user picks WHERE THEY ARE
// (their home), then WHERE THEY WANT TO GO. If a home is already
// remembered from a past visit, we skip straight to exploring.
let pickingHome = true;

/* Swap the hero text to match the current step */
function applyStageText() {
  // The Back button only makes sense on the second step.
  // (The "if" guard keeps an old cached page from crashing here.)
  if (navBackButton) navBackButton.hidden = pickingHome;
  if (pickingHome) {
    heroTitle.textContent = "Where are you now?";
    heroSubtitle.textContent = "First, set your starting point.";
    heroHint.textContent =
      "🌍 Spin the globe and click your home, or type it below.";
    searchInput.placeholder = "type your city, e.g. Chennai";
  } else {
    heroTitle.textContent = "Where do you plan to explore?";
    heroSubtitle.textContent =
      "Weather, destination info, daylight and currency, all in one place.";
    heroHint.textContent =
      "🌍 Spin the globe, then click where you want to go.";
    searchInput.placeholder = "or type a place, e.g. Paris";
  }
}

// The destination the user is currently looking at
let currentDestination = null;

/* The Back button: return to the "Where are you now?" step and
   clear the destination view. */
if (navBackButton) navBackButton.addEventListener("click", function () {
  pickingHome = true;
  currentDestination = null; // any in-flight answers get ignored
  destinationHeader.hidden = true;
  cardsSection.hidden = true;
  exploreSection.hidden = true;
  hideStatus();
  suggestionsBox.hidden = true;
  searchInput.value = "";
  applyStageText();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// The point (latitude/longitude) the user last clicked on the globe
let clickedPoint = null;

// Timer id for the globe's gentle auto-spin
let spinTimer = null;

/* Small helpers for the loading / error message */
function showStatus(text) {
  statusMessage.textContent = text;
  statusMessage.hidden = false;
}
function hideStatus() {
  statusMessage.hidden = true;
}

/* ------------------------------------------------------------
   2. THE INTERACTIVE GLOBE
   We draw a 3D-looking Earth on a <canvas> using a classic map
   trick called the "orthographic projection" — how a globe looks
   from far away. The user can drag to spin it and click to pick
   a spot.
   ------------------------------------------------------------ */

// Where the globe is drawn on the canvas
const GLOBE_SIZE = 640; // the canvas is 640x640 pixels inside
const GLOBE_CX = 320;   // centre x
const GLOBE_CY = 320;   // centre y
const GLOBE_R = 290;    // radius in pixels

// How the globe is currently rotated (in degrees)
let rotationLon = -80;  // which longitude faces us
let rotationLat = 20;   // how much the globe is tilted

// The world map shapes (country outlines), loaded as GeoJSON
let worldShapes = null;

// Load the country shapes, then draw the globe
async function loadWorldShapes() {
  try {
    const url =
      "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json";
    const response = await fetch(url);
    worldShapes = await response.json();
  } catch (error) {
    // If the map can't load we still show a plain globe with a grid,
    // and clicking it still works.
    worldShapes = null;
  }
  drawGlobe();
}

/*
  Turn a latitude/longitude into an x/y position on the canvas.
  Returns "front: false" when the point is on the far side of
  the globe (we then pin it to the globe's edge so country
  shapes still fill nicely).
*/
function projectPoint(lat, lon) {
  const toRad = Math.PI / 180;
  const phi = lat * toRad;
  const lambda = (lon - rotationLon) * toRad;
  const phi0 = rotationLat * toRad;

  // 3D position of the point on a unit sphere, as seen by us
  let x = Math.cos(phi) * Math.sin(lambda);
  let y = Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda);
  const z = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda);

  const front = z >= 0; // z > 0 means the point faces us
  if (!front) {
    // Push far-side points out to the globe's edge
    const len = Math.sqrt(x * x + y * y) || 1;
    x = x / len;
    y = y / len;
  }

  return {
    x: GLOBE_CX + GLOBE_R * x,
    y: GLOBE_CY - GLOBE_R * y,
    front: front,
  };
}

/*
  The reverse: turn a canvas pixel back into latitude/longitude.
  Returns null if the pixel is outside the globe.
  (This is the standard inverse of the orthographic projection.)
*/
function screenToLatLon(px, py) {
  const x = (px - GLOBE_CX) / GLOBE_R;
  const y = (GLOBE_CY - py) / GLOBE_R;
  const rho = Math.sqrt(x * x + y * y);
  if (rho > 1) return null; // clicked outside the globe

  const c = Math.asin(rho);
  const toRad = Math.PI / 180;
  const phi0 = rotationLat * toRad;

  const lat = Math.asin(Math.cos(c) * Math.sin(phi0) + (rho === 0 ? 0 : (y * Math.sin(c) * Math.cos(phi0)) / rho));
  const lon = rotationLon * 1 + Math.atan2(
    x * Math.sin(c),
    rho * Math.cos(c) * Math.cos(phi0) - y * Math.sin(c) * Math.sin(phi0)
  ) / toRad;

  // Keep longitude between -180 and 180
  let lonDeg = ((lon + 540) % 360) - 180;
  return { lat: lat / toRad, lon: lonDeg };
}

// Draw one ring (outline) of a country shape
function drawRing(ring) {
  let anyVisible = false;
  for (const [lon, lat] of ring) {
    if (projectPoint(lat, lon).front) {
      anyVisible = true;
      break;
    }
  }
  if (!anyVisible) return; // whole shape is on the far side — skip it

  for (let i = 0; i < ring.length; i++) {
    const p = projectPoint(ring[i][1], ring[i][0]);
    if (i === 0) globeCtx.moveTo(p.x, p.y);
    else globeCtx.lineTo(p.x, p.y);
  }
  globeCtx.closePath();
}

// Draw the whole globe: ocean, grid lines, countries, marker
function drawGlobe() {
  const ctx = globeCtx;
  ctx.clearRect(0, 0, GLOBE_SIZE, GLOBE_SIZE);

  // Ocean (a soft blue circle with a little shading)
  const ocean = ctx.createRadialGradient(
    GLOBE_CX - 60, GLOBE_CY - 80, 40, GLOBE_CX, GLOBE_CY, GLOBE_R
  );
  ocean.addColorStop(0, "#7dd3fc");
  ocean.addColorStop(1, "#0369a1");
  ctx.beginPath();
  ctx.arc(GLOBE_CX, GLOBE_CY, GLOBE_R, 0, Math.PI * 2);
  ctx.fillStyle = ocean;
  ctx.fill();

  // Grid lines (every 30 degrees) so the spin is visible over oceans.
  // We only draw the parts of each line facing us.
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 1;

  // Vertical lines (meridians)
  for (let lon = -180; lon < 180; lon += 30) {
    drawGridLine(ctx, function (step) {
      return projectPoint(-90 + step * 3, lon); // walk from pole to pole
    }, 61);
  }
  // Horizontal lines (parallels)
  for (let lat = -60; lat <= 60; lat += 30) {
    drawGridLine(ctx, function (step) {
      return projectPoint(lat, -180 + step * 3); // walk around the globe
    }, 121);
  }

  // Countries
  if (worldShapes) {
    ctx.fillStyle = "#4ade80";
    ctx.strokeStyle = "rgba(6, 78, 59, 0.5)";
    ctx.lineWidth = 0.6;
    for (const feature of worldShapes.features) {
      const geom = feature.geometry;
      ctx.beginPath();
      if (geom.type === "Polygon") {
        for (const ring of geom.coordinates) drawRing(ring);
      } else if (geom.type === "MultiPolygon") {
        for (const polygon of geom.coordinates) {
          for (const ring of polygon) drawRing(ring);
        }
      }
      ctx.fill();
      ctx.stroke();
    }
  }

  // A thin outline around the globe
  ctx.beginPath();
  ctx.arc(GLOBE_CX, GLOBE_CY, GLOBE_R, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.6)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // A red pin where the user clicked
  if (clickedPoint) {
    const p = projectPoint(clickedPoint.lat, clickedPoint.lon);
    if (p.front) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

/*
  Helper for the grid: walks along a line in small steps and only
  draws the pieces that are on the visible side of the globe.
  "getPoint(step)" gives us each point; "steps" is how many to walk.
*/
function drawGridLine(ctx, getPoint, steps) {
  ctx.beginPath();
  let drawing = false; // are we in the middle of a visible piece?
  for (let step = 0; step < steps; step++) {
    const p = getPoint(step);
    if (p.front) {
      if (!drawing) {
        ctx.moveTo(p.x, p.y); // start a new visible piece
        drawing = true;
      } else {
        ctx.lineTo(p.x, p.y); // continue the piece
      }
    } else {
      drawing = false; // the line went behind the globe
    }
  }
  ctx.stroke();
}

/* ---- Spinning: the globe slowly rotates on its own until the
        user touches it. This uses a JavaScript timer. ---- */
function startAutoSpin() {
  spinTimer = setInterval(function () {
    rotationLon += 0.2; // a small nudge every 40 ms
    drawGlobe();
  }, 40);
}
function stopAutoSpin() {
  if (spinTimer) {
    clearInterval(spinTimer);
    spinTimer = null;
  }
}

/* ---- Dragging to rotate, and clicking to pick a spot ----
   We use pointer events so this works with both mouse and touch. */
let isDragging = false;
let dragStart = null; // where the pointer went down
let dragLast = null;  // where the pointer was last frame

// The canvas may be scaled by CSS, so convert page pixels
// into canvas pixels first.
function canvasPosition(event) {
  const rect = globeCanvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (GLOBE_SIZE / rect.width),
    y: (event.clientY - rect.top) * (GLOBE_SIZE / rect.height),
  };
}

globeCanvas.addEventListener("pointerdown", function (event) {
  stopAutoSpin(); // the user took control
  isDragging = true;
  dragStart = canvasPosition(event);
  dragLast = dragStart;
  globeCanvas.setPointerCapture(event.pointerId);
});

globeCanvas.addEventListener("pointermove", function (event) {
  if (!isDragging) return;
  const pos = canvasPosition(event);

  // Turn the mouse movement into rotation, so the map follows
  // the cursor: dragging right must show land further west,
  // which means the longitude facing us gets SMALLER.
  rotationLon -= (pos.x - dragLast.x) * 0.35;
  rotationLat += (pos.y - dragLast.y) * 0.35;

  // Don't let the globe flip completely upside down
  rotationLat = Math.max(-85, Math.min(85, rotationLat));

  dragLast = pos;
  drawGlobe();
});

globeCanvas.addEventListener("pointerup", function (event) {
  if (!isDragging) return;
  isDragging = false;

  const pos = canvasPosition(event);
  const movedX = pos.x - dragStart.x;
  const movedY = pos.y - dragStart.y;
  const distanceMoved = Math.sqrt(movedX * movedX + movedY * movedY);

  // If the pointer barely moved, treat it as a click (not a drag)
  if (distanceMoved < 6) {
    const point = screenToLatLon(pos.x, pos.y);
    if (point) {
      clickedPoint = point;
      drawGlobe();
      findNearbyPlaces(point.lat, point.lon);
    }
  }
});

/* ------------------------------------------------------------
   3. CLICKING THE GLOBE → NEARBY PLACE SUGGESTIONS
   We send the clicked latitude/longitude to a free
   reverse-geocoding API (BigDataCloud). It answers with the
   locality, city, region and country around that point, from
   most precise to least precise. The user then picks one.
   ------------------------------------------------------------ */
// The best-known city (the capital) of popular travel countries.
// When you click anywhere in a country, its capital is offered as
// a suggestion too — click rural France and "Paris" is one tap away.
const COUNTRY_TO_CAPITAL = {
  FR: "Paris", JP: "Tokyo", IN: "New Delhi", US: "Washington",
  GB: "London", IT: "Rome", ES: "Madrid", DE: "Berlin",
  PT: "Lisbon", NL: "Amsterdam", BE: "Brussels", AT: "Vienna",
  IE: "Dublin", FI: "Helsinki", GR: "Athens", CH: "Bern",
  SE: "Stockholm", NO: "Oslo", DK: "Copenhagen", PL: "Warsaw",
  CZ: "Prague", HU: "Budapest", RU: "Moscow", TR: "Ankara",
  CN: "Beijing", KR: "Seoul", TH: "Bangkok", VN: "Hanoi",
  ID: "Jakarta", MY: "Kuala Lumpur", SG: "Singapore", PH: "Manila",
  AU: "Canberra", NZ: "Wellington", CA: "Ottawa", MX: "Mexico City",
  BR: "Brasilia", AR: "Buenos Aires", CL: "Santiago", PE: "Lima",
  CO: "Bogota", EG: "Cairo", MA: "Rabat", ZA: "Pretoria",
  KE: "Nairobi", NG: "Abuja", AE: "Abu Dhabi", SA: "Riyadh",
  LK: "Colombo", NP: "Kathmandu", BD: "Dhaka", PK: "Islamabad",
};

async function findNearbyPlaces(lat, lon) {
  suggestionsBox.hidden = true;
  showStatus("🔎 Looking up places near that spot...");

  try {
    const url =
      "https://api.bigdatacloud.net/data/reverse-geocode-client" +
      "?latitude=" + lat + "&longitude=" + lon + "&localityLanguage=en";
    const response = await fetch(url);
    const data = await response.json();

    // Collect suggestions, most precise first, skipping duplicates
    const suggestions = [];
    function addSuggestion(name, label) {
      if (!name) return;
      if (suggestions.some((s) => s.name === name)) return;
      suggestions.push({ name: name, label: label });
    }

    addSuggestion(data.locality, "Locality");
    addSuggestion(data.city, "City");

    // Also offer the country's capital — often the place people
    // actually want when they click somewhere in a country.
    const capital = COUNTRY_TO_CAPITAL[(data.countryCode || "").toUpperCase()];
    if (capital) {
      addSuggestion(capital, "Capital of " + (data.countryName || "the country"));
    }

    // Administrative areas (districts, prefectures, states...),
    // sorted from most specific to least specific
    const areas = (data.localityInfo && data.localityInfo.administrative) || [];
    const sorted = areas.slice().sort(function (a, b) {
      return (b.adminLevel || 0) - (a.adminLevel || 0);
    });
    for (const area of sorted) {
      if ((area.adminLevel || 0) >= 4) {
        addSuggestion(area.name, "Region / District");
      }
    }
    addSuggestion(data.principalSubdivision, "State / Province");
    addSuggestion(data.countryName, "Country");

    if (suggestions.length === 0) {
      showStatus("🌊 That looks like open water! Try clicking on land.");
      return;
    }

    // Remember the country for the currency suggestion later
    clickedPoint.countryName = data.countryName || "";
    clickedPoint.countryCode = data.countryCode || "";

    // Show the suggestions as clickable buttons
    hideStatus();
    suggestionsTitle.textContent = pickingHome
      ? "🏠 Places near where you clicked. Pick where you are:"
      : "🎯 Places near where you clicked. Pick the most precise one:";
    suggestionButtons.innerHTML = "";
    for (const s of suggestions.slice(0, 7)) {
      const button = document.createElement("button");
      button.innerHTML = s.name + "<small>" + s.label + "</small>";
      button.addEventListener("click", function () {
        choosePlace(s.name);
      });
      suggestionButtons.appendChild(button);
    }
    suggestionsBox.hidden = false;
  } catch (error) {
    showStatus("⚠️ Could not look up that spot. Please try again.");
  }
}

/* ------------------------------------------------------------
   4. CHOOSING A PLACE → LOAD ALL THE TRAVEL INFO
   When the user picks a suggestion, we look the name up in the
   Open-Meteo Geocoding API. That can return several places with
   the same name (e.g. many towns called "Springfield"), so we
   choose the result closest to the point clicked on the globe.
   ------------------------------------------------------------ */

// Rough distance between two lat/lon points (good enough to compare)
function roughDistance(lat1, lon1, lat2, lon2) {
  const dLat = lat1 - lat2;
  let dLon = Math.abs(lon1 - lon2);
  if (dLon > 180) dLon = 360 - dLon; // the world wraps around
  return dLat * dLat + dLon * dLon;
}

async function choosePlace(name) {
  suggestionsBox.hidden = true;
  showStatus("Loading travel info for " + name + "...");

  try {
    const url =
      "https://geocoding-api.open-meteo.com/v1/search?count=10&name=" +
      encodeURIComponent(name);
    const response = await fetch(url);
    const data = await response.json();

    let destination;

    if (data.results && data.results.length > 0) {
      // Pick the search result closest to the clicked point
      let best = data.results[0];
      if (clickedPoint) {
        for (const place of data.results) {
          if (
            roughDistance(place.latitude, place.longitude, clickedPoint.lat, clickedPoint.lon) <
            roughDistance(best.latitude, best.longitude, clickedPoint.lat, clickedPoint.lon)
          ) {
            best = place;
          }
        }
      }
      destination = placeToDestination(best);
    } else if (clickedPoint) {
      // The name wasn't in the geocoder (e.g. a small district):
      // just use the exact point the user clicked instead.
      destination = {
        name: name,
        country: clickedPoint.countryName || "",
        countryCode: clickedPoint.countryCode || "",
        latitude: clickedPoint.lat,
        longitude: clickedPoint.lon,
        timezone: "", // the weather API will tell us this
        kind: "region", // these fallbacks are districts/regions
      };
    } else {
      showStatus("😕 Sorry, we couldn't find \"" + name + "\".");
      return;
    }

    await handleChosenPlace(destination);
  } catch (error) {
    showStatus("⚠️ Something went wrong. Please check your connection and try again.");
  }
}

// Used by the "My Trips" list: search a saved city by name
async function searchDestination(cityName) {
  showStatus("Loading travel info for " + cityName + "...");
  try {
    const url =
      "https://geocoding-api.open-meteo.com/v1/search?count=1&name=" +
      encodeURIComponent(cityName);
    const response = await fetch(url);
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      // Not a city? Try the geocoder that knows states and regions
      const options = await searchNominatim(cityName);
      if (options.length === 0) {
        showStatus("😕 Sorry, we couldn't find \"" + cityName + "\".");
        return;
      }
      pointGlobeAt(options[0].dest.latitude, options[0].dest.longitude);
      await handleChosenPlace(options[0].dest);
      return;
    }
    await handleChosenPlace(placeToDestination(data.results[0]));
  } catch (error) {
    showStatus("⚠️ Something went wrong. Please check your connection and try again.");
  }
}

// Turn a geocoder search result into our destination object.
// The geocoder's "feature_code" tells us what KIND of place it
// is: PCL... = a country, ADM... = a state/district/region, and
// anything else is a city, town or village. The "Things to
// Explore" section uses this to pick the right kind of search.
function placeToDestination(place) {
  const code = place.feature_code || "";
  let kind = "place";
  if (code.indexOf("PCL") === 0) kind = "country";
  else if (code.indexOf("ADM") === 0) kind = "region";

  return {
    name: place.name,
    country: place.country || "",
    countryCode: place.country_code || "",
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: place.timezone || "",
    kind: kind,
  };
}

// Spin the globe to a place and drop the red pin on it
function pointGlobeAt(lat, lon) {
  stopAutoSpin();
  clickedPoint = { lat: lat, lon: lon };
  rotationLon = lon;
  rotationLat = Math.max(-85, Math.min(85, lat));
  drawGlobe();
}

/* ---- The small search bar: type an exact location ---- */
searchForm.addEventListener("submit", function (event) {
  event.preventDefault(); // stop the page from reloading
  const text = searchInput.value.trim();
  if (text !== "") {
    searchExactLocation(text);
  }
});

async function searchExactLocation(name) {
  suggestionsBox.hidden = true;
  showStatus("🔎 Searching for \"" + name + "\"...");

  try {
    // First ask Open-Meteo's geocoder — fast and great for cities.
    // Each option is {dest, label}: the place, and a small line
    // saying where it is.
    const url =
      "https://geocoding-api.open-meteo.com/v1/search?count=5&name=" +
      encodeURIComponent(name);
    const response = await fetch(url);
    const data = await response.json();
    let options = (data.results || []).map(function (place) {
      return {
        dest: placeToDestination(place),
        label: [place.admin1, place.country].filter(Boolean).join(", ") || "Location",
      };
    });

    // Open-Meteo only knows cities and towns. If it found nothing
    // (e.g. "Tamil Nadu" or "Provence"), ask OpenStreetMap's
    // geocoder, which understands states, districts and regions.
    if (options.length === 0) {
      options = await searchNominatim(name);
    }

    if (options.length === 0) {
      showStatus("😕 Sorry, we couldn't find \"" + name + "\". Try another spelling!");
      return;
    }

    // Choosing an option points the globe there and loads it
    function chooseOption(option) {
      suggestionsBox.hidden = true;
      pointGlobeAt(option.dest.latitude, option.dest.longitude);
      handleChosenPlace(option.dest);
    }

    // Exactly one match — go straight there
    if (options.length === 1) {
      chooseOption(options[0]);
      return;
    }

    // Several places share this name (Paris, France vs Paris,
    // Texas...) — let the user pick the exact one.
    hideStatus();
    suggestionsTitle.textContent = "🎯 Several places match. Pick the exact one:";
    suggestionButtons.innerHTML = "";
    for (const option of options) {
      const button = document.createElement("button");
      button.append(option.dest.name);
      const small = document.createElement("small");
      small.textContent = option.label;
      button.appendChild(small);
      button.addEventListener("click", function () {
        chooseOption(option);
      });
      suggestionButtons.appendChild(button);
    }
    suggestionsBox.hidden = false;
  } catch (error) {
    showStatus("⚠️ Something went wrong. Please check your connection and try again.");
  }
}

// Ask OpenStreetMap's "Nominatim" geocoder (free, no key). Unlike
// Open-Meteo it also knows states, districts and regions.
async function searchNominatim(name) {
  const url =
    "https://nominatim.openstreetmap.org/search" +
    "?q=" + encodeURIComponent(name) +
    "&format=jsonv2&limit=5&addressdetails=1&accept-language=en";

  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) return [];
  const results = await response.json();

  return results.map(function (r) {
    const address = r.address || {};

    // What kind of place is it? (used by "Things to Explore")
    let kind = "place";
    if (r.addresstype === "country") kind = "country";
    else if (["state", "region", "county", "district", "province",
      "state_district", "municipality"].indexOf(r.addresstype) !== -1) {
      kind = "region";
    }

    return {
      dest: {
        name: r.name || name,
        country: address.country || "",
        countryCode: (address.country_code || "").toUpperCase(),
        latitude: parseFloat(r.lat),
        longitude: parseFloat(r.lon),
        timezone: "", // the weather API will tell us this
        kind: kind,
      },
      label: prettifyTag(r.addresstype || "place") +
        (address.country ? " · " + address.country : ""),
    };
  });
}

/* Every way of picking a place (globe click, search bar, saved
   trip) lands here. During step 1 the chosen place becomes the
   user's HOME; afterwards it is a travel destination. */
async function handleChosenPlace(destination) {
  if (pickingHome) {
    finishHomeSetup(destination);
  } else {
    await showDestination(destination);
  }
}

// Step 1 complete: remember home, play the plane transition,
// then switch the page into "explore" mode.
function finishHomeSetup(destination) {
  localStorage.setItem("travelBuddyHome", JSON.stringify({
    name: destination.name,
    country: destination.country,
    latitude: destination.latitude,
    longitude: destination.longitude,
  }));
  homeInput.value = destination.name;

  hideStatus();
  suggestionsBox.hidden = true;
  pickingHome = false;

  playPlaneTransition();
}

/* ------------------------------------------------------------
   THE PAGE-SWIPE TRANSITION
   The plane sweeps across the screen like a windscreen wiper:
   ahead of it (white side of the video) the real FIRST page is
   still there; behind it the real SECOND page is revealed.

   The trick that makes it perfectly smooth: the plane picture is
   cut out of the video ONCE, then the sweep is just one gliding
   element plus a clip that follows it — no video decoding and no
   pixel work during the animation at all.
   ------------------------------------------------------------ */

// Which video pixels are background (not the plane)?
//  - anything cool (blue >= red): the white & gray backgrounds
//  - near-white: compression noise like (255, 252, 249)
//  - dark pixels: the dashed flight-path line in the video
function isVideoBackground(r, g, b) {
  return (
    b >= r - 2 ||
    (r > 245 && g > 245 && b > 245) ||
    (r < 100 && g < 100 && b < 100)
  );
}

// Cut the plane out of the video into a transparent image.
// Done once, then remembered.
let planeSprite = null;
async function getPlaneSprite() {
  if (planeSprite) return planeSprite;

  const video = document.getElementById("plane-video");
  if (!video.videoWidth) {
    await new Promise(function (resolve, reject) {
      video.onloadeddata = resolve;
      video.onerror = reject;
    });
  }

  // Jump to a frame where the whole plane is on screen
  video.currentTime = 0.62;
  await new Promise(function (resolve) { video.onseeked = resolve; });

  // Draw the frame small, then remove the background with a
  // "flood fill" from the picture's borders: like pouring water in
  // from every edge, it erases all background it can flow into —
  // even the pockets between the wings and the body — but it can
  // never reach the shiny white spots INSIDE the plane's outline,
  // so those stay untouched.
  const W = 960, H = 540;
  const work = document.createElement("canvas");
  work.width = W;
  work.height = H;
  const ctx = work.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, W, H);
  const frame = ctx.getImageData(0, 0, W, H);
  const px = frame.data;

  const visited = new Uint8Array(W * H);
  const queue = [];

  function pour(p) {
    if (visited[p]) return;
    const i = p * 4;
    if (!isVideoBackground(px[i], px[i + 1], px[i + 2])) return;
    visited[p] = 1;
    px[i + 3] = 0; // erase this background pixel
    queue.push(p);
  }

  // Start pouring from every border pixel...
  for (let x = 0; x < W; x++) { pour(x); pour((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { pour(y * W); pour(y * W + W - 1); }

  // ...and let it spread to the neighbours, over and over
  while (queue.length > 0) {
    const p = queue.pop();
    const x = p % W;
    if (x > 0) pour(p - 1);
    if (x < W - 1) pour(p + 1);
    if (p >= W) pour(p - W);
    if (p < W * (H - 1)) pour(p + W);
  }

  // Clean-up pass: the dashed flight-path line leaves small
  // leftover blobs. Group the visible pixels into connected
  // "islands" and erase every island smaller than 80 pixels —
  // only the plane itself is big enough to survive.
  const island = new Int32Array(W * H); // 0 = not labelled yet
  let islandId = 0;
  for (let start = 0; start < W * H; start++) {
    if (px[start * 4 + 3] === 0 || island[start] !== 0) continue;

    // Collect this whole island
    islandId++;
    const members = [start];
    island[start] = islandId;
    for (let k = 0; k < members.length; k++) {
      const p = members[k];
      const x = p % W;
      const around = [];
      if (x > 0) around.push(p - 1);
      if (x < W - 1) around.push(p + 1);
      if (p >= W) around.push(p - W);
      if (p < W * (H - 1)) around.push(p + W);
      for (const n of around) {
        if (px[n * 4 + 3] > 0 && island[n] === 0) {
          island[n] = islandId;
          members.push(n);
        }
      }
    }

    // Tiny island? Erase it.
    if (members.length < 80) {
      for (const p of members) px[p * 4 + 3] = 0;
    }
  }

  // Find the box around what is left (the plane)
  let top = H, bottom = 0, leftMost = W, rightMost = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (px[(y * W + x) * 4 + 3] > 0) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < leftMost) leftMost = x;
        if (x > rightMost) rightMost = x;
      }
    }
  }
  if (rightMost <= leftMost) throw new Error("no plane found in video");
  ctx.putImageData(frame, 0, 0);

  // Crop tightly around the plane
  const sw = rightMost - leftMost + 1;
  const sh = bottom - top + 1;
  const sprite = document.createElement("canvas");
  sprite.width = sw;
  sprite.height = sh;
  sprite.getContext("2d").drawImage(work, leftMost, top, sw, sh, 0, 0, sw, sh);

  planeSprite = { canvas: sprite, heightShare: sh / H, topShare: top / H };
  return planeSprite;
}

// A gentle speed curve: slow start, fast middle, soft landing
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function playPlaneTransition() {
  planeOverlay.hidden = false;
  window.scrollTo(0, 0); // the sweep happens over the hero

  // ---- Build the "second page" preview layer ----
  // A copy of the hero with the step-2 words already in place.
  const hero = document.querySelector(".hero");
  const heroRect = hero.getBoundingClientRect();
  const preview = document.createElement("div");
  // The preview needs the page's own night-sky background so it
  // fully covers the step-1 words underneath the revealed part.
  preview.style.cssText =
    "position:absolute; inset:0; clip-path:inset(0 100% 0 0);" +
    "background: radial-gradient(120% 100% at 50% 115%," +
    " #2e4d80 0%, #1a2b4a 40%, #0b1222 70%, #04060c 100%) #04060c;";

  // The navbar looks the same on both steps — copy it so it does
  // not vanish behind the preview's background.
  const navCopy = document.querySelector(".navbar").cloneNode(true);
  navCopy.style.cssText = "position:absolute; top:0; left:0; right:0;";
  preview.appendChild(navCopy);

  const heroCopy = hero.cloneNode(true);
  heroCopy.querySelector("#hero-title").textContent =
    "Where do you plan to explore?";
  heroCopy.querySelector("#hero-subtitle").textContent =
    "Weather, destination info, daylight and currency, all in one place.";
  heroCopy.querySelector("#hero-hint").textContent =
    "🌍 Spin the globe, then click where you want to go.";
  heroCopy.querySelector("#search-input").value = "";
  heroCopy.querySelector("#search-input").placeholder =
    "or type a place, e.g. Paris";
  heroCopy.querySelector("#status-message").hidden = true;
  heroCopy.querySelector("#suggestions").hidden = true;
  const globeCopy = heroCopy.querySelector("#globe");

  // Two elements must never share an id — strip them off the copy
  heroCopy.removeAttribute("id");
  heroCopy.querySelectorAll("[id]").forEach(function (el) {
    el.removeAttribute("id");
  });

  // Pin the copy exactly over the real hero
  heroCopy.style.cssText =
    "position:absolute; top:" + heroRect.top + "px; left:" + heroRect.left +
    "px; width:" + heroRect.width + "px;";

  // The clone lost its ids, so the "#globe" size rule no longer
  // applies to it — give it the real globe's size directly, so the
  // globe stays EXACTLY the same size and place during the sweep.
  const globeRect = globeCanvas.getBoundingClientRect();
  globeCopy.style.width = globeRect.width + "px";
  globeCopy.style.height = globeRect.height + "px";

  preview.appendChild(heroCopy);
  planeOverlay.appendChild(preview);

  // A cloned <canvas> starts blank — repaint the globe onto it
  globeCopy.getContext("2d").drawImage(globeCanvas, 0, 0);

  let finished = false;

  // Completely done: make the real page step 2 and clean up
  function endTransition(spriteEl) {
    if (finished) return;
    finished = true;
    applyStageText();
    preview.remove();
    if (spriteEl) spriteEl.remove();
    planeElement.hidden = true; // in case the emoji backup ran
    planeOverlay.hidden = true;
  }

  // Backup plan: no usable video? Fly the ✈️ emoji instead.
  function useEmojiInstead() {
    preview.style.clipPath = "inset(0 0 0 0)"; // show page 2 fully
    planeElement.hidden = false;
    planeElement.style.animation = "none";
    void planeElement.offsetWidth; // restart the CSS animation
    planeElement.style.animation = "";
    setTimeout(function () { endTransition(null); }, 2600);
  }

  // ---- The sweep itself ----
  getPlaneSprite().then(function (sprite) {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    // Size the plane like it appears in the video (same share of
    // the screen height, same vertical position)
    const planeH = sprite.heightShare * screenH;
    const planeW = planeH * (sprite.canvas.width / sprite.canvas.height);
    const spriteEl = sprite.canvas;
    spriteEl.style.cssText =
      "position:absolute; left:0; top:" + (sprite.topShare * screenH) + "px;" +
      "height:" + planeH + "px; width:" + planeW + "px;" +
      "will-change: transform;";
    spriteEl.style.transform = "translateX(" + (-planeW) + "px)";
    planeOverlay.appendChild(spriteEl);

    // One shared timeline drives the plane AND the reveal, so the
    // page-2 edge is always exactly at the plane's nose.
    const DURATION = 1700; // milliseconds
    const startedAt = performance.now();

    function tick(now) {
      if (finished) return;
      const progress = Math.min(1, (now - startedAt) / DURATION);
      const eased = easeInOutCubic(progress);

      // The nose travels from the left edge right off the screen
      const nose = eased * (screenW + planeW);
      spriteEl.style.transform =
        "translateX(" + (nose - planeW) + "px)";

      const revealPercent = Math.min(100, (nose / screenW) * 100);
      preview.style.clipPath =
        "inset(0 " + (100 - revealPercent) + "% 0 0)";

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        endTransition(spriteEl);
      }
    }
    requestAnimationFrame(tick);

    // Guaranteed landing, even if animation frames get throttled
    setTimeout(function () { endTransition(spriteEl); }, DURATION + 200);
  }).catch(useEmojiInstead);

  // Safety net: never leave the user stuck on the overlay
  setTimeout(function () { endTransition(null); }, 6000);
}

// Shared by both flows above: show the header, then fill every card
async function showDestination(destination) {
  currentDestination = destination;

  destinationCity.textContent = destination.name;
  destinationCountry.textContent = destination.country;
  destinationHeader.hidden = false;
  cardsSection.hidden = false;

  updateSaveButton();
  suggestDestinationCurrency();

  // Scroll to the results RIGHT AWAY (the cards fill in as data
  // arrives). Scrolling after the fetches finished caused a bug:
  // if an API was slow, the page suddenly jumped down seconds
  // later, stealing the user's next click on the globe.
  hideStatus();
  destinationHeader.scrollIntoView({ behavior: "smooth" });

  // Weather first — its reply also tells us the local timezone,
  // which the sunrise/sunset card needs.
  await loadWeather();
  await Promise.all([
    loadSunTimes(),
    loadWikipedia(),
    loadThingsToDo(),
    loadTimeDifference(),
    loadDistance(),
    loadEmergencyNumbers(),
  ]);
}

/* ------------------------------------------------------------
   5. WEATHER (Open-Meteo Weather API)
   ------------------------------------------------------------ */

// Open-Meteo describes weather with a number code.
// This little table turns the code into words + an emoji icon.
function describeWeather(code) {
  if (code === 0) return { text: "Clear sky", icon: "☀️" };
  if (code === 1) return { text: "Mainly clear", icon: "🌤️" };
  if (code === 2) return { text: "Partly cloudy", icon: "⛅" };
  if (code === 3) return { text: "Overcast", icon: "☁️" };
  if (code === 45 || code === 48) return { text: "Foggy", icon: "🌫️" };
  if (code >= 51 && code <= 57) return { text: "Drizzle", icon: "🌦️" };
  if (code >= 61 && code <= 67) return { text: "Rain", icon: "🌧️" };
  if (code >= 71 && code <= 77) return { text: "Snow", icon: "❄️" };
  if (code >= 80 && code <= 82) return { text: "Rain showers", icon: "🌧️" };
  if (code === 85 || code === 86) return { text: "Snow showers", icon: "🌨️" };
  if (code >= 95) return { text: "Thunderstorm", icon: "⛈️" };
  return { text: "Unknown", icon: "🌡️" };
}

async function loadWeather() {
  // Remember which destination this request belongs to. If the
  // user picks a NEW place before this slow answer arrives, the
  // check further down throws the old answer away — otherwise a
  // late reply would overwrite the new place's card.
  const destination = currentDestination;

  weatherContent.innerHTML = "<p class='muted'>Loading weather...</p>";

  try {
    const url =
      "https://api.open-meteo.com/v1/forecast" +
      "?latitude=" + destination.latitude +
      "&longitude=" + destination.longitude +
      "&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code" +
      "&daily=temperature_2m_max,temperature_2m_min,weather_code" +
      "&forecast_days=3&timezone=auto";

    const response = await fetch(url);
    const data = await response.json();

    // "timezone=auto" makes the API tell us the destination's
    // timezone — the sunrise/sunset card uses it.
    if (data.timezone) {
      destination.timezone = data.timezone;
    }

    // The user moved on to another place? Ignore this answer.
    if (destination !== currentDestination) return;

    const current = data.current;
    const weather = describeWeather(current.weather_code);

    // Build a short 3-day forecast list
    let forecastHTML = "";
    if (data.daily && data.daily.time) {
      forecastHTML = "<div class='forecast'>";
      for (let i = 0; i < data.daily.time.length; i++) {
        const day = new Date(data.daily.time[i] + "T00:00:00")
          .toLocaleDateString(undefined, { weekday: "short" });
        const dayWeather = describeWeather(data.daily.weather_code[i]);
        forecastHTML +=
          "<div>" + day + ": " + dayWeather.icon + " " +
          Math.round(data.daily.temperature_2m_min[i]) + "° / " +
          Math.round(data.daily.temperature_2m_max[i]) + "°C</div>";
      }
      forecastHTML += "</div>";
    }

    weatherContent.innerHTML =
      "<span class='weather-icon'>" + weather.icon + "</span> " +
      "<span class='weather-temp'>" + Math.round(current.temperature_2m) + "°C</span>" +
      "<p>" + weather.text + "</p>" +
      "<p class='weather-detail'>Feels like " + Math.round(current.apparent_temperature) + "°C</p>" +
      "<p class='weather-detail'>Humidity: " + current.relative_humidity_2m + "%</p>" +
      "<p class='weather-detail'>Wind: " + Math.round(current.wind_speed_10m) + " km/h</p>" +
      forecastHTML;
  } catch (error) {
    if (destination !== currentDestination) return;
    weatherContent.innerHTML = "<p class='muted'>⚠️ Could not load the weather right now.</p>";
  }
}

/* ------------------------------------------------------------
   6. SUNRISE & SUNSET (Sunrise-Sunset API)
   The API gives times in UTC, so we convert them into the
   destination's own timezone to make them easy to understand.
   ------------------------------------------------------------ */
async function loadSunTimes() {
  // Remember which destination this request belongs to (see the
  // note in loadWeather about slow answers arriving late).
  const destination = currentDestination;

  sunContent.innerHTML = "<p class='muted'>Loading daylight times...</p>";

  try {
    // formatted=0 asks for exact ISO times (in UTC)
    const url =
      "https://api.sunrise-sunset.org/json?formatted=0" +
      "&lat=" + destination.latitude +
      "&lng=" + destination.longitude;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK") {
      throw new Error("Sunrise API error");
    }

    // The user moved on to another place? Ignore this answer.
    if (destination !== currentDestination) return;

    // Convert the UTC times into the destination's local timezone
    const options = {
      hour: "numeric",
      minute: "2-digit",
      timeZone: destination.timezone || "UTC",
    };
    const sunrise = new Date(data.results.sunrise).toLocaleTimeString(undefined, options);
    const sunset = new Date(data.results.sunset).toLocaleTimeString(undefined, options);

    sunContent.innerHTML =
      "<div class='sun-times'>" +
      "<p>🌅 Sunrise: <strong>" + sunrise + "</strong></p>" +
      "<p>🌇 Sunset: <strong>" + sunset + "</strong></p>" +
      "<p class='muted'>Local time in " + destination.name + "</p>" +
      "</div>";
  } catch (error) {
    if (destination !== currentDestination) return;
    sunContent.innerHTML = "<p class='muted'>⚠️ Could not load sunrise and sunset times.</p>";
  }
}

/* ------------------------------------------------------------
   7. DESTINATION INFO (Wikipedia API)
   We use Wikipedia's "summary" endpoint, which returns a short
   description and an image for a page.
   ------------------------------------------------------------ */
async function loadWikipedia() {
  // Remember which destination this request belongs to (see the
  // note in loadWeather about slow answers arriving late).
  const destination = currentDestination;

  wikiContent.innerHTML = "<p class='muted'>Loading destination info...</p>";

  try {
    const url =
      "https://en.wikipedia.org/api/rest_v1/page/summary/" +
      encodeURIComponent(destination.name);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Wikipedia page not found");
    }
    const data = await response.json();

    // The user moved on to another place? Ignore this answer.
    if (destination !== currentDestination) return;

    // Add the image only if Wikipedia has one
    let imageHTML = "";
    if (data.thumbnail && data.thumbnail.source) {
      imageHTML = "<img class='wiki-image' src='" + data.thumbnail.source +
        "' alt='" + data.title + "' />";
    }

    // Keep the description short (about 2 sentences)
    let summary = data.extract || "No description available.";
    if (summary.length > 300) {
      summary = summary.slice(0, 300) + "…";
    }

    const pageUrl = data.content_urls ? data.content_urls.desktop.page : "#";

    wikiContent.innerHTML =
      imageHTML +
      "<strong>" + data.title + "</strong>" +
      "<p>" + summary + "</p>" +
      "<a class='wiki-link' href='" + pageUrl + "' target='_blank' rel='noopener'>Read more on Wikipedia →</a>";
  } catch (error) {
    if (destination !== currentDestination) return;
    wikiContent.innerHTML = "<p class='muted'>⚠️ No Wikipedia information found for this destination.</p>";
  }
}

/* ------------------------------------------------------------
   7b. THINGS TO EXPLORE (Wikipedia GeoSearch API)
   Free, no API key. Wikipedia can list every article about a
   place within a few kilometres of a point on the map — famous
   sights, buildings, parks and even legendary cafés. Each one
   comes with a short description like "Church in Paris, France",
   which we use both to sort it into a category and to describe it.
   ------------------------------------------------------------ */

// The categories we show. A place goes into the first category
// whose keywords appear in its Wikipedia description, and each
// category shows at most "max" places. Monuments and tourist
// spots get the most room.
const EXPLORE_CATEGORIES = [
  {
    key: "touristSpots",
    title: "🗼 Tourist Spots",
    max: 6,
    keywords: ["museum", "gallery", "attraction", "landmark",
      "square", "plaza", "aquarium", "zoo", "exhibition",
      "observation", "viewpoint"],
  },
  {
    key: "monuments",
    title: "🗿 Monuments",
    max: 6,
    keywords: ["monument", "memorial", "statue", "obelisk", "column",
      "mausoleum", "tomb", "ruin", "archaeological", "triumphal arch",
      "historic site", "amphitheatre", "amphitheater",
      // grand buildings count as monuments too
      "church", "cathedral", "basilica", "chapel", "mosque",
      "temple", "synagogue", "castle", "palace", "bridge", "tower",
      "opera", "theatre", "theater", "fountain", "gate",
      "building", "mansion", "library"],
  },
  {
    key: "cafesAndRestaurants",
    title: "☕ Cafés & Restaurants",
    max: 6,
    keywords: ["café", "cafe", "restaurant", "brasserie", "bistro", "coffee"],
  },
  {
    key: "nature",
    title: "🌿 Nature",
    max: 6,
    keywords: ["park", "garden", "forest", "lake", "island", "botanical",
      "canal", "beach", "hill", "mountain"],
  },
];

/* For a WIDE AREA (a state, district, region or country) a 4 km
   circle around its centre point would miss almost everything.
   Instead we ask Wikipedia's article SEARCH for the area's
   highlights, one tuned query per category. */
const REGION_CATEGORIES = [
  {
    key: "touristSpots",
    title: "🗼 Tourist Spots",
    max: 6,
    search: "famous tourist attractions in",
    keywords: ["attraction", "landmark", "museum", "heritage", "site",
      "hill", "beach", "island", "unesco", "resort", "entertainment",
      "square", "gallery", "zoo", "aquarium"],
  },
  {
    key: "monuments",
    title: "🗿 Monuments",
    max: 6,
    search: "famous monuments and temples in",
    keywords: ["monument", "memorial", "statue", "tomb", "ruins",
      "archaeological", "temple", "palace", "fort", "castle", "church",
      "cathedral", "basilica", "chapel", "mosque", "shrine", "stupa",
      "tower", "bridge", "cemetery", "opera", "amphitheatre"],
  },
  {
    key: "nature",
    title: "🌿 Nature",
    max: 6,
    search: "national parks waterfalls and nature in",
    keywords: ["park", "waterfall", "falls", "mountain", "lake",
      "forest", "wildlife", "sanctuary", "reserve", "hill", "river",
      "beach", "island", "garden", "valley", "gorge", "cave", "glacier"],
  },
  {
    key: "cities",
    title: "🏙️ Cities to Visit",
    max: 6,
    search: "major cities in",
    keywords: ["city", "capital", "town", "prefecture", "metropolis"],
  },
];

async function loadThingsToDo() {
  // Remember which destination this request belongs to. This
  // lookup can be slow — without this check, answers for a
  // PREVIOUS place could arrive late and fill the section with
  // the wrong city's spots.
  const destination = currentDestination;

  // A city gets "what's nearby"; a state/region/country gets
  // "the highlights of the whole area".
  const isWideArea =
    destination.kind === "region" || destination.kind === "country";
  const categories = isWideArea ? REGION_CATEGORIES : EXPLORE_CATEGORIES;

  exploreSection.hidden = false;
  exploreCity.textContent = destination.name;
  exploreGrid.innerHTML = "";
  exploreNote.textContent = isWideArea
    ? "✨ Finding the highlights of " + destination.name + "..."
    : "🗺️ Searching for places nearby...";
  exploreNote.hidden = false;

  try {
    let ideas;

    if (isWideArea) {
      ideas = await fetchRegionHighlights(destination);
      if (destination !== currentDestination) return;
    } else {
      // Two lookups at the same time:
      //  - Wikipedia: famous sights, monuments, nature, buildings
      //  - OpenStreetMap: everyday cafés and restaurants
      // "allSettled" means one failing doesn't break the other.
      const [wikiResult, foodResult] = await Promise.allSettled([
        fetchWikipediaPlaces(destination),
        fetchCafesAndRestaurants(destination),
      ]);

      // The user moved on to another place? Ignore these answers.
      if (destination !== currentDestination) return;

      // Start with Wikipedia's categories (or empty lists if it failed)
      if (wikiResult.status === "fulfilled") {
        ideas = wikiResult.value;
      } else {
        ideas = {};
        for (const category of EXPLORE_CATEGORIES) ideas[category.key] = [];
      }

      // Add the OpenStreetMap cafés & restaurants (skip duplicates)
      if (foodResult.status === "fulfilled") {
        const cafeCategory = EXPLORE_CATEGORIES.find(
          (c) => c.key === "cafesAndRestaurants"
        );
        for (const item of foodResult.value) {
          const list = ideas.cafesAndRestaurants;
          if (list.length >= cafeCategory.max) break;
          if (!list.some((existing) => existing.name === item.name)) {
            list.push(item);
          }
        }
      }
    }

    // Thin result? Never leave the section empty — top it up with
    // a broader search for the area's famous spots.
    let total = 0;
    for (const c of categories) total += ideas[c.key].length;
    if (total < 4) {
      await topUpWithFamousSpots(destination, ideas, categories);
      if (destination !== currentDestination) return;
    }

    const foundAnything = categories.some((c) => ideas[c.key].length > 0);
    if (!foundAnything) {
      exploreNote.textContent =
        "🗺️ No places found for this area. Try a nearby city instead.";
      return;
    }

    exploreNote.hidden = true;
    renderThingsToDo(ideas, categories);
  } catch (error) {
    if (destination !== currentDestination) return;
    exploreNote.textContent =
      "⚠️ Could not load places right now. Try again in a minute.";
    exploreNote.hidden = false;
  }
}

// Turn "Ariyalūr" into "ariyalur": lowercase and without accent
// marks, so names from different sources can be compared.
function simplifyName(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/* When the local lookup finds little (small towns, remote areas),
   search Wikipedia more broadly for the area's famous spots and
   fill the categories with them. A spot that fits no category
   goes to Tourist Spots, the catch-all. */
// Words that make a Wikipedia description sound like a PLACE a
// traveller could visit (used to filter out railway lines, films,
// companies and other non-places).
const PLACE_WORDS = ["temple", "fort", "palace", "beach", "falls",
  "waterfall", "dam", "town", "city", "village", "museum", "park",
  "hill", "lake", "sanctuary", "reserve", "monument", "church",
  "mosque", "shrine", "island", "cave", "garden", "zoo", "bridge",
  "tower", "valley", "river", "mountain", "basilica", "cathedral",
  "attraction", "landmark", "memorial", "ruins", "site"];

async function topUpWithFamousSpots(destination, ideas, categories) {
  try {
    const plainName = simplifyName(destination.name);
    const where =
      plainName + (destination.country ? " " + destination.country : "");

    // Two broad searches, run together
    const searches = await Promise.allSettled([
      searchWikipedia('"' + plainName + '" famous places to visit tourist attractions'),
      searchWikipedia(where + " temples forts palaces beaches waterfalls attractions"),
    ]);
    let pages = [];
    for (const s of searches) {
      if (s.status === "fulfilled") pages = pages.concat(s.value);
    }

    // Names we already show, across all categories
    const seenNames = [destination.name];
    for (const c of categories) {
      for (const item of ideas[c.key]) seenNames.push(item.name);
    }

    for (const page of pages) {
      if (isNoisePage(page) || seenNames.includes(page.title)) continue;

      // Keep only things that SOUND like places to visit
      const description = page.description.toLowerCase();
      const soundsLikeAPlace = PLACE_WORDS.some(function (word) {
        return description.includes(word);
      });
      if (!soundsLikeAPlace) continue;

      // Put it in the first category its description fits;
      // no fit at all → Tourist Spots
      let target = categories.find((c) =>
        (c.keywords || []).some((k) => description.includes(k))
      );
      if (!target) {
        target = categories.find((c) => c.key === "touristSpots") ||
          categories[0];
      }

      if (ideas[target.key].length >= target.max) continue;
      ideas[target.key].push({
        name: page.title,
        why: page.description,
        url: "https://en.wikipedia.org/wiki/" + encodeURIComponent(page.title),
      });
      seenNames.push(page.title);
    }
  } catch (error) {
    // The top-up is best-effort — whatever we already have still shows
  }
}

/* ---- Wide areas: search Wikipedia for the area's highlights ---- */
async function fetchRegionHighlights(destination) {
  // Quoting the area name ("Karnataka") makes it a REQUIRED word
  // in the search; adding the country makes regions more precise.
  const quotedName = '"' + simplifyName(destination.name) + '"';
  const countryHint =
    destination.kind === "country" ? "" : " " + (destination.country || "");

  // One search per category, plus one broad "famous everything"
  // search that helps big countries — all at the same time.
  const queries = REGION_CATEGORIES.map(
    (category) => category.search + " " + quotedName + countryHint
  );
  queries.push(
    quotedName + " famous tourist attractions landmarks monuments nature"
  );
  const searches = await Promise.allSettled(queries.map(searchWikipedia));

  // Each category picks from its own search results first, then
  // from the broad search's results.
  const lastSearch = searches[searches.length - 1];
  const broadPool = lastSearch.status === "fulfilled" ? lastSearch.value : [];

  const ideas = {};
  const seenNames = [destination.name]; // don't list the area itself

  for (let i = 0; i < REGION_CATEGORIES.length; i++) {
    const category = REGION_CATEGORIES[i];
    ideas[category.key] = [];
    const ownPool = searches[i].status === "fulfilled" ? searches[i].value : [];

    for (const page of ownPool.concat(broadPool)) {
      if (ideas[category.key].length >= category.max) break;
      if (isNoisePage(page) || seenNames.includes(page.title)) continue;

      // Keep only pages whose description fits the category...
      const description = page.description.toLowerCase();
      const fits = category.keywords.some((k) => description.includes(k));
      if (!fits) continue;

      // ...AND that actually mention the area — the search can
      // rank a famous temple in the wrong country highly, but a
      // real match says e.g. "in Karnataka" or "in France".
      const text = simplifyName(page.title + " " + page.description);
      if (!text.includes(simplifyName(destination.name))) continue;

      ideas[category.key].push({
        name: page.title,
        why: page.description,
        url: "https://en.wikipedia.org/wiki/" + encodeURIComponent(page.title),
      });
      seenNames.push(page.title);
    }
  }

  return ideas;
}

// Run one Wikipedia full-text search and return its pages,
// best matches first.
async function searchWikipedia(query) {
  const url =
    "https://en.wikipedia.org/w/api.php" +
    "?action=query&generator=search" +
    "&gsrsearch=" + encodeURIComponent(query) +
    "&gsrlimit=20&prop=description&format=json&origin=*";

  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    throw new Error("Wikipedia error " + response.status);
  }
  const data = await response.json();
  const pages = Object.values((data.query && data.query.pages) || {});
  pages.sort((a, b) => (a.index || 0) - (b.index || 0));
  return pages;
}

// Pages that are not real places to visit: index pages
// ("List of..."), overview articles, and pages without any
// description at all.
function isNoisePage(page) {
  if (!page.title || !page.description) return true;
  const title = page.title;
  return (
    title.indexOf("List of") === 0 ||
    title.indexOf("Lists of") === 0 ||
    title.indexOf("Tourism in") === 0 ||
    title.indexOf("Index of") === 0 ||
    title.indexOf("Outline of") === 0 ||
    title.indexOf("History of") === 0
  );
}

/* ---- Source 1: Wikipedia (sights, monuments, nature...) ---- */
async function fetchWikipediaPlaces(destination) {
  // Wikipedia's "geosearch" finds articles located within a
  // radius of a map point. "prop=description" also gives each
  // one a short description. "origin=*" allows browser requests.
  const url =
    "https://en.wikipedia.org/w/api.php" +
    "?action=query&generator=geosearch" +
    "&ggscoord=" + destination.latitude + "%7C" + destination.longitude +
    "&ggsradius=4000&ggslimit=100" +
    "&prop=description&format=json&origin=*";

  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    throw new Error("Wikipedia error " + response.status);
  }
  const data = await response.json();

  // The pages arrive as an object — turn it into a list, and
  // sort by "index" so the closest places come first.
  const pages = Object.values((data.query && data.query.pages) || {});
  pages.sort((a, b) => (a.index || 0) - (b.index || 0));

  return sortPlacesIntoCategories(pages);
}

/* ---- Source 2: OpenStreetMap (cafés & restaurants) ---- */

// Overpass has several public servers; if one is busy, try the next
const OVERPASS_SERVERS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

async function fetchCafesAndRestaurants(destination) {
  // Overpass query language: named cafés and restaurants within
  // 3000 metres of the destination.
  const query =
    "[out:json][timeout:15];" +
    "nwr(around:3000," +
    destination.latitude + "," + destination.longitude +
    ')["amenity"~"^(cafe|restaurant)$"]["name"];' +
    "out tags 40;";

  for (const server of OVERPASS_SERVERS) {
    try {
      const response = await fetch(server, {
        method: "POST",
        body: "data=" + encodeURIComponent(query),
        // Give up on a slow server and try the next one
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) continue;
      const data = await response.json();

      // Turn each map entry into a {name, why} item, e.g.
      // "Le Severo — French · Restaurant"
      const items = [];
      for (const element of data.elements) {
        const tags = element.tags || {};
        if (!tags.name) continue;
        const kind = tags.amenity === "cafe" ? "Café" : "Restaurant";
        items.push({
          name: tags.name,
          why: tags.cuisine
            ? prettifyTag(tags.cuisine.split(";")[0]) + " · " + kind
            : kind,
        });
      }
      return items;
    } catch (error) {
      // This server failed — the loop tries the next one
    }
  }
  throw new Error("Cafés lookup failed");
}

// Make raw map values readable: "ice_cream" -> "Ice cream"
function prettifyTag(value) {
  const text = String(value).replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Put each Wikipedia page into the first category whose keywords
// appear in its description (up to 4 per category). Pages that
// match nothing — history events, people, organisations — are
// simply skipped.
function sortPlacesIntoCategories(pages) {
  // Start with an empty list for every category
  const ideas = {};
  for (const category of EXPLORE_CATEGORIES) {
    ideas[category.key] = [];
  }
  const seenNames = [];

  for (const page of pages) {
    const name = page.title;
    const description = (page.description || "").toLowerCase();
    if (isNoisePage(page) || seenNames.includes(name)) continue;
    if (name === currentDestination.name) continue; // the city itself

    for (const category of EXPLORE_CATEGORIES) {
      const matches = category.keywords.some(function (keyword) {
        return description.includes(keyword);
      });

      if (matches && ideas[category.key].length < category.max) {
        ideas[category.key].push({
          name: name,
          why: page.description, // e.g. "Church in Paris, France"
          url: "https://en.wikipedia.org/wiki/" + encodeURIComponent(name),
        });
        seenNames.push(name);
        break; // a place goes into one category only
      }
    }
  }

  return ideas;
}

// Draw the category columns. We build elements with textContent
// (not innerHTML) so place names from the map are shown as plain
// text, never treated as code.
function renderThingsToDo(ideas, categories) {
  exploreGrid.innerHTML = "";

  for (const category of categories || EXPLORE_CATEGORIES) {
    const items = ideas[category.key];
    if (!items || items.length === 0) continue;

    const column = document.createElement("div");
    column.className = "explore-category";

    const heading = document.createElement("h4");
    heading.textContent = category.title;
    column.appendChild(heading);

    const list = document.createElement("ul");
    for (const item of items) {
      const li = document.createElement("li");

      // If the place has a link (its Wikipedia article), make the
      // name clickable; otherwise show it as plain bold text.
      let name;
      if (item.url) {
        name = document.createElement("a");
        name.className = "explore-link";
        name.href = item.url;
        name.target = "_blank";
        name.rel = "noopener";
      } else {
        name = document.createElement("strong");
      }
      name.textContent = item.name;

      const why = document.createElement("small");
      why.textContent = item.why;
      li.appendChild(name);
      li.appendChild(why);
      list.appendChild(li);
    }
    column.appendChild(list);
    exploreGrid.appendChild(column);
  }
}

/* ------------------------------------------------------------
   7c. TIME ZONES & DISTANCE (timeapi.io + a little math)
   The user tells us where THEY are ("home"). We remember it in
   localStorage, then:
    - the Time Zones card compares the clocks at home and at the
      destination using https://timeapi.io (free, no key)
    - the Distance card measures how far away the destination is
      and estimates travel time by plane, train, car and ship
   ------------------------------------------------------------ */

// Read / save the home location (localStorage stores text only)
function getHomeLocation() {
  const stored = localStorage.getItem("travelBuddyHome");
  return stored ? JSON.parse(stored) : null;
}

// The user typed where they are — find it and remember it
homeButton.addEventListener("click", setHomeLocation);
homeInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") setHomeLocation();
});

async function setHomeLocation() {
  const name = homeInput.value.trim();
  if (name === "") return;

  timezoneContent.innerHTML = "<p class='muted'>Finding " + name + "...</p>";

  try {
    const url =
      "https://geocoding-api.open-meteo.com/v1/search?count=1&name=" +
      encodeURIComponent(name);
    const response = await fetch(url);
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      timezoneContent.innerHTML =
        "<p class='muted'>😕 Couldn't find \"" + name + "\". Try a nearby city.</p>";
      return;
    }

    const place = data.results[0];
    localStorage.setItem("travelBuddyHome", JSON.stringify({
      name: place.name,
      country: place.country || "",
      latitude: place.latitude,
      longitude: place.longitude,
    }));
    homeInput.value = place.name;

    // Refresh both cards for the destination on screen (if any)
    if (currentDestination) {
      loadTimeDifference();
      loadDistance();
    } else {
      timezoneContent.innerHTML =
        "<p class='muted'>✅ Saved! Pick a destination to compare times.</p>";
    }
  } catch (error) {
    timezoneContent.innerHTML =
      "<p class='muted'>⚠️ Could not look that up right now.</p>";
  }
}

/* ---- Card: time zone difference ---- */
async function loadTimeDifference() {
  const destination = currentDestination;
  const home = getHomeLocation();

  if (!home) {
    timezoneContent.innerHTML =
      "<p class='muted'>Tell us where you are to compare times.</p>";
    return;
  }

  timezoneContent.innerHTML = "<p class='muted'>Checking the clocks...</p>";

  try {
    // Ask timeapi.io for the current time at both places.
    // It works from coordinates — no timezone names needed.
    function timeUrl(place) {
      return "https://timeapi.io/api/time/current/coordinate" +
        "?latitude=" + place.latitude + "&longitude=" + place.longitude;
    }
    const [homeTime, destTime] = await Promise.all([
      fetch(timeUrl(home), { signal: AbortSignal.timeout(12000) }).then(r => r.json()),
      fetch(timeUrl(destination), { signal: AbortSignal.timeout(12000) }).then(r => r.json()),
    ]);

    // The user moved on to another place? Ignore this answer.
    if (destination !== currentDestination) return;

    // Compare the two local clocks, in minutes
    const diffMinutes = Math.round(
      (new Date(destTime.dateTime) - new Date(homeTime.dateTime)) / 60000
    );
    const hours = Math.floor(Math.abs(diffMinutes) / 60);
    const minutes = Math.abs(diffMinutes) % 60;
    let diffText;
    if (diffMinutes === 0) {
      diffText = "🕐 Same time as " + home.name + "!";
    } else {
      diffText =
        "🕐 " + destination.name + " is " + hours + "h" +
        (minutes ? " " + minutes + "m" : "") +
        (diffMinutes > 0 ? " ahead of " : " behind ") +
        (diffMinutes > 0 ? home.name : home.name);
    }

    timezoneContent.innerHTML =
      "<div class='tz-row'><span>🏠 " + home.name + "</span>" +
      "<span class='tz-time'>" + homeTime.time + "</span></div>" +
      "<div class='tz-row'><span>📍 " + destination.name + "</span>" +
      "<span class='tz-time'>" + destTime.time + "</span></div>" +
      "<p class='tz-diff'>" + diffText + "</p>";
  } catch (error) {
    if (destination !== currentDestination) return;
    timezoneContent.innerHTML =
      "<p class='muted'>⚠️ Could not compare the clocks right now.</p>";
  }
}

/* ---- Card: distance & travel time ---- */

// Straight-line ("as the crow flies") distance between two points
// on Earth, using the well-known haversine formula.
function distanceInKm(lat1, lon1, lat2, lon2) {
  const toRad = Math.PI / 180;
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Typical average speeds, in km/h — rough estimates for fun
const TRAVEL_MODES = [
  { icon: "✈️", label: "Flight", speed: 800 },
  { icon: "🚆", label: "Train", speed: 90 },
  { icon: "🚗", label: "Car", speed: 65 },
  { icon: "🚢", label: "Ship", speed: 40 },
];

// Turn hours into a friendly "2d 5h" / "3h 20m" text
function formatDuration(hoursTotal) {
  const minutes = Math.round(hoursTotal * 60);
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = minutes % 60;
  if (days > 0) return days + "d " + hours + "h";
  if (hours > 0) return hours + "h " + (mins ? mins + "m" : "");
  return mins + "m";
}

function loadDistance() {
  const destination = currentDestination;
  const home = getHomeLocation();

  if (!home) {
    distanceContent.innerHTML =
      "<p class='muted'>Set where you are (in the Time Zones card) to see how far away this is.</p>";
    return;
  }

  const km = distanceInKm(
    home.latitude, home.longitude,
    destination.latitude, destination.longitude
  );

  let modesHTML = "<div class='travel-modes'>";
  for (const mode of TRAVEL_MODES) {
    modesHTML +=
      "<div><span>" + mode.icon + " " + mode.label + "</span>" +
      "<span>" + formatDuration(km / mode.speed) + "</span></div>";
  }
  modesHTML += "</div>";

  distanceContent.innerHTML =
    "<span class='distance-value'>" + Math.round(km).toLocaleString() + " km</span>" +
    "<p class='muted'>from " + home.name + ", as the crow flies</p>" +
    modesHTML +
    "<p class='muted' style='margin-top:8px; font-size:0.8rem;'>" +
    "Rough estimates from average speeds, not real routes.</p>";
}

/* ------------------------------------------------------------
   7d. EMERGENCY CONTACTS (Wikipedia)
   Police / ambulance / fire numbers for the destination country,
   read from Wikipedia's "List of emergency telephone numbers"
   page. The page is downloaded and read ONCE, then remembered.
   ------------------------------------------------------------ */
const EMERGENCY_PAGE =
  "https://en.wikipedia.org/wiki/List_of_emergency_telephone_numbers";

let emergencyTable = null; // country name -> numbers, once loaded

async function getEmergencyTable() {
  if (emergencyTable) return emergencyTable;

  const response = await fetch(
    "https://en.wikipedia.org/api/rest_v1/page/html/List_of_emergency_telephone_numbers",
    { signal: AbortSignal.timeout(20000) }
  );
  if (!response.ok) throw new Error("Wikipedia error " + response.status);
  const html = await response.text();

  // Read the page like the browser does, then walk its table rows:
  // each row is Country | Police | Ambulance | Fire | Other
  const doc = new DOMParser().parseFromString(html, "text/html");

  // Footnote marks like "[44]" are not part of the number
  function cleanCell(cell) {
    return cell.textContent.replace(/\[[^\]]*\]/g, "").trim();
  }

  // Some rows merge columns (e.g. Japan's 119 covers ambulance AND
  // fire, written as one wide cell). Expanding each cell by its
  // "colspan" keeps every value in the right column.
  function expandRow(row) {
    const values = [];
    for (const cell of row.querySelectorAll("td, th")) {
      const span = parseInt(cell.getAttribute("colspan") || "1", 10);
      const value = cleanCell(cell);
      for (let k = 0; k < span; k++) values.push(value);
    }
    return values;
  }

  // Long entries like "112; also 999 for..." are trimmed to the
  // first part so the card stays tidy
  function firstPart(value) {
    return value.split(";")[0].trim().slice(0, 24);
  }

  emergencyTable = {};
  for (const row of doc.querySelectorAll("tr")) {
    const values = expandRow(row);
    if (values.length < 4) continue;
    const country = simplifyName(values[0]);
    if (!country || emergencyTable[country]) continue;
    emergencyTable[country] = {
      police: firstPart(values[1]),
      ambulance: firstPart(values[2]),
      fire: firstPart(values[3]),
    };
  }
  return emergencyTable;
}

async function loadEmergencyNumbers() {
  const destination = currentDestination;

  if (!destination.country) {
    emergencyContent.innerHTML =
      "<p class='muted'>No country information for this place.</p>";
    return;
  }

  emergencyContent.innerHTML = "<p class='muted'>Looking up numbers...</p>";

  try {
    const table = await getEmergencyTable();
    if (destination !== currentDestination) return;

    // Find the destination's country in the table. Names can vary
    // slightly ("United States" vs "United States of America"),
    // so also try a contains-match both ways.
    const wanted = simplifyName(destination.country);
    let numbers = table[wanted];
    if (!numbers) {
      for (const name in table) {
        if (name.includes(wanted) || wanted.includes(name)) {
          numbers = table[name];
          break;
        }
      }
    }

    if (!numbers) {
      emergencyContent.innerHTML =
        "<p class='muted'>No listing found for " + destination.country +
        ". In most countries, 112 works.</p>";
      return;
    }

    emergencyContent.innerHTML =
      "<div class='emg-row'><span>🚓 Police</span>" +
      "<span class='emg-number'>" + (numbers.police || "112") + "</span></div>" +
      "<div class='emg-row'><span>🚑 Ambulance</span>" +
      "<span class='emg-number'>" + (numbers.ambulance || "112") + "</span></div>" +
      "<div class='emg-row'><span>🚒 Fire</span>" +
      "<span class='emg-number'>" + (numbers.fire || "112") + "</span></div>" +
      "<p class='muted emg-source'>For " + destination.country +
      " · <a href='" + EMERGENCY_PAGE +
      "' target='_blank' rel='noopener'>source: Wikipedia</a></p>";
  } catch (error) {
    if (destination !== currentDestination) return;
    emergencyContent.innerHTML =
      "<p class='muted'>⚠️ Could not load the numbers. In most countries, 112 works.</p>";
  }
}

/* ------------------------------------------------------------
   8. CURRENCY CONVERTER (Frankfurter API)
   ------------------------------------------------------------ */

// The common currencies we support in the dropdowns
const CURRENCIES = ["INR", "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "SGD"];

// A small map from country code to currency, used to auto-suggest
// the destination's currency after picking a place.
const COUNTRY_TO_CURRENCY = {
  IN: "INR", US: "USD", GB: "GBP", JP: "JPY", AU: "AUD", CA: "CAD", SG: "SGD",
  // Countries that use the Euro
  FR: "EUR", DE: "EUR", IT: "EUR", ES: "EUR", PT: "EUR", NL: "EUR", BE: "EUR",
  AT: "EUR", IE: "EUR", FI: "EUR", GR: "EUR",
};

// Fill both dropdowns with the currency options
function fillCurrencyDropdowns() {
  for (const code of CURRENCIES) {
    fromCurrency.innerHTML += "<option value='" + code + "'>" + code + "</option>";
    toCurrency.innerHTML += "<option value='" + code + "'>" + code + "</option>";
  }
  fromCurrency.value = "INR";
  toCurrency.value = "USD";
}

// Pick the destination country's currency automatically (if we
// know it). The user can still change it manually.
function suggestDestinationCurrency() {
  const code = (currentDestination.countryCode || "").toUpperCase();
  const currency = COUNTRY_TO_CURRENCY[code];
  if (currency) {
    toCurrency.value = currency;
  }
  convertResult.textContent = "";
}

convertButton.addEventListener("click", convertCurrency);

async function convertCurrency() {
  const amount = parseFloat(amountInput.value);
  const from = fromCurrency.value;
  const to = toCurrency.value;

  if (isNaN(amount) || amount <= 0) {
    convertResult.textContent = "Please enter a valid amount.";
    return;
  }

  // Converting a currency to itself needs no API call
  if (from === to) {
    convertResult.textContent = amount.toLocaleString() + " " + from;
    return;
  }

  convertResult.textContent = "Converting...";

  try {
    const url =
      "https://api.frankfurter.dev/v1/latest?amount=" + amount +
      "&from=" + from + "&to=" + to;
    const response = await fetch(url);
    const data = await response.json();
    const converted = data.rates[to];

    convertResult.textContent =
      amount.toLocaleString() + " " + from + " = " +
      converted.toLocaleString(undefined, { maximumFractionDigits: 2 }) + " " + to;
  } catch (error) {
    convertResult.textContent = "⚠️ Could not convert right now. Try again later.";
  }
}

/* ------------------------------------------------------------
   9. SAVED DESTINATIONS (localStorage)
   localStorage can only store text, so we use JSON.stringify to
   save our list and JSON.parse to read it back.
   ------------------------------------------------------------ */

// Read the saved list from localStorage (or start with an empty list)
function getSavedDestinations() {
  const stored = localStorage.getItem("travelBuddySaved");
  return stored ? JSON.parse(stored) : [];
}

function setSavedDestinations(list) {
  localStorage.setItem("travelBuddySaved", JSON.stringify(list));
}

function isCurrentDestinationSaved() {
  return getSavedDestinations().some(
    (d) => d.name === currentDestination.name
  );
}

// Update the Save button text depending on saved state
function updateSaveButton() {
  if (isCurrentDestinationSaved()) {
    saveButton.textContent = "❤️ Saved";
    saveButton.classList.add("saved");
  } else {
    saveButton.textContent = "♡ Save Destination";
    saveButton.classList.remove("saved");
  }
}

// Clicking the button saves the destination (or removes it if saved)
saveButton.addEventListener("click", function () {
  let saved = getSavedDestinations();

  if (isCurrentDestinationSaved()) {
    saved = saved.filter((d) => d.name !== currentDestination.name);
  } else {
    saved.push({
      name: currentDestination.name,
      country: currentDestination.country,
    });
  }

  setSavedDestinations(saved);
  updateSaveButton();
  renderSavedList();
});

// Draw the "My Trips" list on the page
function renderSavedList() {
  const saved = getSavedDestinations();
  savedList.innerHTML = "";
  noSavedMessage.hidden = saved.length > 0;

  for (const trip of saved) {
    const item = document.createElement("li");

    // Clicking the name loads that destination again
    const nameButton = document.createElement("button");
    nameButton.className = "trip-name";
    nameButton.textContent = "❤️ " + trip.name;
    nameButton.addEventListener("click", function () {
      // A saved trip is always a DESTINATION, even if the page is
      // still on the "where are you now?" step.
      pickingHome = false;
      applyStageText();
      searchDestination(trip.name);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // The little ✕ button removes the trip
    const removeButton = document.createElement("button");
    removeButton.className = "remove-trip";
    removeButton.textContent = "✕";
    removeButton.title = "Remove " + trip.name;
    removeButton.addEventListener("click", function () {
      const remaining = getSavedDestinations().filter(
        (d) => d.name !== trip.name
      );
      setSavedDestinations(remaining);
      renderSavedList();
      if (currentDestination) updateSaveButton();
    });

    item.appendChild(nameButton);
    item.appendChild(removeButton);
    savedList.appendChild(item);
  }
}

/* ------------------------------------------------------------
   RUN ON PAGE LOAD
   ------------------------------------------------------------ */
fillCurrencyDropdowns();
renderSavedList();
// The journey ALWAYS begins at "Where are you now?". If a home
// is remembered from last time, pre-type it in the search bar so
// one click on 🔍 continues straight through.
if (getHomeLocation()) {
  homeInput.value = getHomeLocation().name;
  searchInput.value = getHomeLocation().name;
}
applyStageText();
drawGlobe();        // draw the plain globe right away
loadWorldShapes();  // then load the country shapes onto it
startAutoSpin();    // gently spin until the user grabs it
