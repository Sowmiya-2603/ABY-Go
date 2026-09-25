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
    "JavaScript error: " + event.message +
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
/* ------------------------------------------------------------
   ICONS (from lucide.dev, ISC licence) - small inline SVG pictures
   used everywhere instead of emojis. icon("name") returns one;
   icon("name", true) returns it filled in (used for saved hearts).
   ------------------------------------------------------------ */
const ICONS = {
  "globe": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><circle cx=\"12\" cy=\"12\" r=\"10\" /><path d=\"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20\" /><path d=\"M2 12h20\" /></svg>",
  "search": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"m21 21-4.34-4.34\" /><circle cx=\"11\" cy=\"11\" r=\"8\" /></svg>",
  "heart": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5\" /></svg>",
  "sunrise": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M12 2v8\" /><path d=\"m4.93 10.93 1.41 1.41\" /><path d=\"M2 18h2\" /><path d=\"M20 18h2\" /><path d=\"m19.07 10.93-1.41 1.41\" /><path d=\"M22 22H2\" /><path d=\"m8 6 4-4 4 4\" /><path d=\"M16 18a4 4 0 0 0-8 0\" /></svg>",
  "sunset": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M12 10V2\" /><path d=\"m4.93 10.93 1.41 1.41\" /><path d=\"M2 18h2\" /><path d=\"M20 18h2\" /><path d=\"m19.07 10.93-1.41 1.41\" /><path d=\"M22 22H2\" /><path d=\"m16 6-4 4-4-4\" /><path d=\"M16 18a4 4 0 0 0-8 0\" /></svg>",
  "map-pin": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0\" /><circle cx=\"12\" cy=\"10\" r=\"3\" /></svg>",
  "clock": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><circle cx=\"12\" cy=\"12\" r=\"10\" /><path d=\"M12 6v6l4 2\" /></svg>",
  "sparkles": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z\" /><path d=\"M20 2v4\" /><path d=\"M22 4h-4\" /><circle cx=\"4\" cy=\"20\" r=\"2\" /></svg>",
  "ferris-wheel": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><circle cx=\"12\" cy=\"12\" r=\"2\" /><path d=\"M12 2v4\" /><path d=\"m6.8 15-3.5 2\" /><path d=\"m20.7 7-3.5 2\" /><path d=\"M6.8 9 3.3 7\" /><path d=\"m20.7 17-3.5-2\" /><path d=\"m9 22 3-8 3 8\" /><path d=\"M8 22h8\" /><path d=\"M18 18.7a9 9 0 1 0-12 0\" /></svg>",
  "landmark": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M10 18v-7\" /><path d=\"M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z\" /><path d=\"M14 18v-7\" /><path d=\"M18 18v-7\" /><path d=\"M3 22h18\" /><path d=\"M6 18v-7\" /></svg>",
  "coffee": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M10 2v2\" /><path d=\"M14 2v2\" /><path d=\"M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1\" /><path d=\"M6 2v2\" /></svg>",
  "leaf": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M11 20a10 10 0 0010-10 25.9 25.9 0 00-1.04-7.281 1 1 0 00-1.755-.325C15.833 5.5 13 5.5 9.8 6.1A7 7 0 0011 20\" /><path d=\"M2 21a5 5 0 012.911-4.544C7.613 15.212 8.351 15.24 11 13\" /></svg>",
  "building-2": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M10 12h4\" /><path d=\"M10 8h4\" /><path d=\"M14 21v-3a2 2 0 0 0-4 0v3\" /><path d=\"M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2\" /><path d=\"M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16\" /></svg>",
  "map": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z\" /><path d=\"M15 5.764v15\" /><path d=\"M9 3.236v15\" /></svg>",
  "triangle-alert": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\" /><path d=\"M12 9v4\" /><path d=\"M12 17h.01\" /></svg>",
  "frown": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M15 10V9\" /><path d=\"M9 10V9\" /><path d=\"M9 16a5 5 0 016 0\" /><circle cx=\"12\" cy=\"12\" r=\"10\" /></svg>",
  "waves": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M2 12q2.5 2 5 0t5 0 5 0 5 0\" /><path d=\"M2 19q2.5 2 5 0t5 0 5 0 5 0\" /><path d=\"M2 5q2.5 2 5 0t5 0 5 0 5 0\" /></svg>",
  "house": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8\" /><path d=\"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\" /></svg>",
  "target": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><circle cx=\"12\" cy=\"12\" r=\"10\" /><circle cx=\"12\" cy=\"12\" r=\"6\" /><circle cx=\"12\" cy=\"12\" r=\"2\" /></svg>",
  "sun": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><circle cx=\"12\" cy=\"12\" r=\"4\" /><path d=\"M12 2v2\" /><path d=\"M12 20v2\" /><path d=\"m4.93 4.93 1.41 1.41\" /><path d=\"m17.66 17.66 1.41 1.41\" /><path d=\"M2 12h2\" /><path d=\"M20 12h2\" /><path d=\"m6.34 17.66-1.41 1.41\" /><path d=\"m19.07 4.93-1.41 1.41\" /></svg>",
  "cloud-sun": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M12 2v2\" /><path d=\"m4.93 4.93 1.41 1.41\" /><path d=\"M20 12h2\" /><path d=\"m19.07 4.93-1.41 1.41\" /><path d=\"M15.947 12.65a4 4 0 0 0-5.925-4.128\" /><path d=\"M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z\" /></svg>",
  "cloud": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z\" /></svg>",
  "cloud-fog": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242\" /><path d=\"M16 17H7\" /><path d=\"M17 21H9\" /></svg>",
  "cloud-drizzle": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242\" /><path d=\"M8 19v1\" /><path d=\"M8 14v1\" /><path d=\"M16 19v1\" /><path d=\"M16 14v1\" /><path d=\"M12 21v1\" /><path d=\"M12 16v1\" /></svg>",
  "cloud-rain": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242\" /><path d=\"M16 14v6\" /><path d=\"M8 14v6\" /><path d=\"M12 16v6\" /></svg>",
  "snowflake": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"m10 20-1.25-2.5L6 18\" /><path d=\"M10 4 8.75 6.5 6 6\" /><path d=\"m14 20 1.25-2.5L18 18\" /><path d=\"m14 4 1.25 2.5L18 6\" /><path d=\"m17 21-3-6h-4\" /><path d=\"m17 3-3 6 1.5 3\" /><path d=\"M2 12h6.5L10 9\" /><path d=\"m20 10-1.5 2 1.5 2\" /><path d=\"M22 12h-6.5L14 15\" /><path d=\"m4 10 1.5 2L4 14\" /><path d=\"m7 21 3-6-1.5-3\" /><path d=\"m7 3 3 6h4\" /></svg>",
  "cloud-snow": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242\" /><path d=\"M8 15h.01\" /><path d=\"M8 19h.01\" /><path d=\"M12 17h.01\" /><path d=\"M12 21h.01\" /><path d=\"M16 15h.01\" /><path d=\"M16 19h.01\" /></svg>",
  "cloud-lightning": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973\" /><path d=\"m13 12-3 5h4l-3 5\" /></svg>",
  "thermometer": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z\" /></svg>",
  "check": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M20 6 9 17l-5-5\" /></svg>",
  "plane": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z\" /></svg>",
  "train-front": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M8 3.1V7a4 4 0 0 0 8 0V3.1\" /><path d=\"m9 15-1-1\" /><path d=\"m15 15 1-1\" /><path d=\"M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z\" /><path d=\"m8 19-2 3\" /><path d=\"m16 19 2 3\" /></svg>",
  "car": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2\" /><circle cx=\"7\" cy=\"17\" r=\"2\" /><path d=\"M9 17h6\" /><circle cx=\"17\" cy=\"17\" r=\"2\" /></svg>",
  "ship": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M12 2v2\" /><path d=\"M12 9.189V13\" /><path d=\"M19 12V6a2 2 0 00-2-2H7a2 2 0 00-2 2v6\" /><path d=\"M19.38 19A11.6 11.6 0 0021 13l-8.188-3.639a2 2 0 00-1.624 0L3 13.001a11.6 11.6 0 002.81 7.76\" /><path d=\"M2 20c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1\" /></svg>",
  "shield": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\" /></svg>",
  "ambulance": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M10 10H6\" /><path d=\"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2\" /><path d=\"M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.923-.641a1 1 0 0 1-.578-.502l-1.539-3.076A1 1 0 0 0 16.382 8H14\" /><path d=\"M8 8v4\" /><path d=\"M9 18h6\" /><circle cx=\"17\" cy=\"18\" r=\"2\" /><circle cx=\"7\" cy=\"18\" r=\"2\" /></svg>",
  "flame": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4\" /></svg>",
  "x": "<svg class=\"icon\" xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" ><path d=\"M18 6 6 18\" /><path d=\"m6 6 12 12\" /></svg>",
};
// Each icon gets a colour that suits what it shows
const ICON_COLORS = {
  "sun": "#fbbf24",
  "cloud-sun": "#f5c95c",
  "cloud": "#94a3b8",
  "cloud-fog": "#94a3b8",
  "cloud-drizzle": "#60a5fa",
  "cloud-rain": "#60a5fa",
  "snowflake": "#bae6fd",
  "cloud-snow": "#bae6fd",
  "cloud-lightning": "#facc15",
  "thermometer": "#f87171",
  "sunrise": "#fbbf24",
  "sunset": "#fb923c",
  "map-pin": "#f87171",
  "clock": "#93c5fd",
  "sparkles": "#e8cf9e",
  "ferris-wheel": "#f472b6",
  "landmark": "#d9c08c",
  "coffee": "#d2a679",
  "leaf": "#4ade80",
  "building-2": "#93c5fd",
  "map": "#86efac",
  "triangle-alert": "#fbbf24",
  "frown": "#fbbf24",
  "waves": "#60a5fa",
  "house": "#93c5fd",
  "target": "#f87171",
  "globe": "#7dd3fc",
  "check": "#4ade80",
  "plane": "#93c5fd",
  "train-front": "#a5b4fc",
  "car": "#fca5a5",
  "ship": "#7dd3fc",
  "shield": "#60a5fa",
  "ambulance": "#f87171",
  "flame": "#fb923c",
  "heart": "#fb7185",
};
function icon(name, filled) {
  let svg = ICONS[name] || "";
  const color = ICON_COLORS[name];
  if (color) svg = svg.replace("<svg ", '<svg style="color:' + color + '" ');
  if (filled) svg = svg.replace('class="icon"', 'class="icon icon-filled"');
  return svg;
}

let pickingHome = true;

/* Swap the hero text to match the current step */
function applyStageText() {
  // The Back button only makes sense on the second step.
  // (The "if" guard keeps an old cached page from crashing here.)
  if (navBackButton) navBackButton.hidden = pickingHome;
  if (pickingHome) {
    heroTitle.textContent = "Where are you now?";
    heroSubtitle.textContent = "First, set your starting point.";
    heroHint.innerHTML =
      icon("globe") + " Spin the globe and click your home, or type it below.";
    searchInput.placeholder = "type your city, e.g. Chennai";
  } else {
    heroTitle.textContent = "Where do you plan to explore?";
    heroSubtitle.textContent =
      "Weather, destination info, daylight and currency, all in one place.";
    heroHint.innerHTML =
      icon("globe") + " Spin the globe, then click where you want to go.";
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
function showStatus(text, iconName) {
  statusMessage.innerHTML = iconName ? icon(iconName) + " " : "";
  statusMessage.appendChild(document.createTextNode(text));
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

// A real satellite photo of Earth (NASA's "Blue Marble", public
// domain), stored flat like a world map. Once it loads we paint the
// globe from it pixel by pixel; until then the plain drawing shows.
let earthTexture = null; // { data, width, height }
function loadEarthTexture() {
  const img = new Image();
  img.onload = function () {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const cctx = c.getContext("2d", { willReadFrequently: true });
    cctx.drawImage(img, 0, 0);
    earthTexture = {
      data: cctx.getImageData(0, 0, c.width, c.height).data,
      width: c.width,
      height: c.height,
    };
    drawGlobe();
  };
  img.src = "earth.jpg?v=2"; // bump this if the photo file changes
}

// Reusable buffers for the photo globe, so we don't allocate new
// ones on every frame while spinning.
const SPHERE_RES = 480; // photo is drawn at 480x480, then scaled up
let sphereCanvas = null;
let sphereImage = null;

/*
  Paint the satellite photo onto the globe. For every pixel inside
  the circle we work out which latitude/longitude is under it (the
  same math the click handler uses) and copy that spot's colour
  from the flat NASA photo.
*/
function drawTexturedSphere(ctx) {
  if (!sphereCanvas) {
    sphereCanvas = document.createElement("canvas");
    sphereCanvas.width = SPHERE_RES;
    sphereCanvas.height = SPHERE_RES;
    sphereImage = sphereCanvas.getContext("2d").createImageData(SPHERE_RES, SPHERE_RES);
  }
  const out = sphereImage.data;
  const tex = earthTexture.data;
  const tw = earthTexture.width;
  const th = earthTexture.height;

  const toRad = Math.PI / 180;
  const phi0 = rotationLat * toRad;
  const sinPhi0 = Math.sin(phi0);
  const cosPhi0 = Math.cos(phi0);
  const lonOffset = rotationLon * toRad;
  const feather = 2 / SPHERE_RES; // soften the outer edge a little

  let k = 0;
  for (let j = 0; j < SPHERE_RES; j++) {
    const y = 1 - (2 * (j + 0.5)) / SPHERE_RES; // -1..1, up is +
    for (let i = 0; i < SPHERE_RES; i++, k += 4) {
      const x = (2 * (i + 0.5)) / SPHERE_RES - 1;
      const rho2 = x * x + y * y;
      if (rho2 > 1) { out[k + 3] = 0; continue; }

      // Inverse orthographic projection (see screenToLatLon)
      const cosc = Math.sqrt(1 - rho2);
      const lat = Math.asin(cosc * sinPhi0 + y * cosPhi0);
      const lon = lonOffset + Math.atan2(x, cosc * cosPhi0 - y * sinPhi0);

      // Where that lat/lon sits inside the flat photo
      let u = ((lon / toRad + 180) / 360) % 1;
      if (u < 0) u += 1;
      const v = (90 - lat / toRad) / 180;
      let ti = ((Math.min(th - 1, (v * th) | 0) * tw) + Math.min(tw - 1, (u * tw) | 0)) * 4;

      out[k] = tex[ti];
      out[k + 1] = tex[ti + 1];
      out[k + 2] = tex[ti + 2];
      // Fade the very edge of the circle so it isn't jagged
      const rho = Math.sqrt(rho2);
      out[k + 3] = rho > 1 - feather ? (255 * (1 - rho)) / feather : 255;
    }
  }
  sphereCanvas.getContext("2d").putImageData(sphereImage, 0, 0);
  ctx.drawImage(
    sphereCanvas,
    0, 0, SPHERE_RES, SPHERE_RES,
    GLOBE_CX - GLOBE_R, GLOBE_CY - GLOBE_R, GLOBE_R * 2, GLOBE_R * 2
  );
}

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

/*
  Trace thin country borders over the satellite photo. Unlike the
  filled shapes, we only draw the pieces of each border that face
  us, lifting the pen whenever a line slips behind the globe.
*/
function drawCountryBorders(ctx) {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();

  function traceRing(ring) {
    let drawing = false;
    for (const [lon, lat] of ring) {
      const p = projectPoint(lat, lon);
      if (p.front) {
        if (!drawing) {
          ctx.moveTo(p.x, p.y);
          drawing = true;
        } else {
          ctx.lineTo(p.x, p.y);
        }
      } else {
        drawing = false; // the border went around the far side
      }
    }
  }

  for (const feature of worldShapes.features) {
    const geom = feature.geometry;
    if (geom.type === "Polygon") {
      for (const ring of geom.coordinates) traceRing(ring);
    } else if (geom.type === "MultiPolygon") {
      for (const polygon of geom.coordinates) {
        for (const ring of polygon) traceRing(ring);
      }
    }
  }
  ctx.stroke();
}

// Draw the whole globe: ocean, grid lines, countries, marker
function drawGlobe() {
  const ctx = globeCtx;
  ctx.clearRect(0, 0, GLOBE_SIZE, GLOBE_SIZE);

  if (earthTexture) {
    // The real satellite photo of Earth, with thin country borders
    drawTexturedSphere(ctx);
    if (worldShapes) drawCountryBorders(ctx);
  } else {
  // Ocean: deep blues, lit from the upper left like a real planet
  const ocean = ctx.createRadialGradient(
    GLOBE_CX - 90, GLOBE_CY - 110, 40, GLOBE_CX, GLOBE_CY, GLOBE_R
  );
  ocean.addColorStop(0, "#2596d1");
  ocean.addColorStop(0.55, "#0077be");
  ocean.addColorStop(1, "#014e7c");
  ctx.beginPath();
  ctx.arc(GLOBE_CX, GLOBE_CY, GLOBE_R, 0, Math.PI * 2);
  ctx.fillStyle = ocean;
  ctx.fill();

  // Grid lines (every 30 degrees) so the spin is visible over oceans.
  // We only draw the parts of each line facing us.
  ctx.strokeStyle = "rgba(255, 255, 255, 0.10)";
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

  // Countries: muted natural greens, brighter where the light hits
  if (worldShapes) {
    const land = ctx.createRadialGradient(
      GLOBE_CX - 90, GLOBE_CY - 110, 40, GLOBE_CX, GLOBE_CY, GLOBE_R
    );
    land.addColorStop(0, "#32a032");
    land.addColorStop(0.55, "#228b22");
    land.addColorStop(1, "#145214");
    ctx.fillStyle = land;
    ctx.strokeStyle = "rgba(5, 28, 17, 0.6)";
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
  } // end of the plain (photo-less) globe drawing

  // Sphere shading painted over everything: a gentle highlight where
  // the light lands, falling away into shadow at the far edge. This
  // is what makes the flat circle read as a solid 3D ball.
  const shade = ctx.createRadialGradient(
    GLOBE_CX - 90, GLOBE_CY - 110, 30, GLOBE_CX, GLOBE_CY, GLOBE_R
  );
  shade.addColorStop(0, "rgba(255, 255, 255, 0.16)");
  shade.addColorStop(0.35, "rgba(255, 255, 255, 0)");
  shade.addColorStop(0.7, "rgba(3, 8, 20, 0.1)");
  shade.addColorStop(0.9, "rgba(3, 8, 20, 0.25)");
  shade.addColorStop(1, "rgba(3, 8, 20, 0.45)");
  ctx.beginPath();
  ctx.arc(GLOBE_CX, GLOBE_CY, GLOBE_R, 0, Math.PI * 2);
  ctx.fillStyle = shade;
  ctx.fill();

  // A whisper of sunlight glinting off the ocean near the light
  const glint = ctx.createRadialGradient(
    GLOBE_CX - 120, GLOBE_CY - 140, 5, GLOBE_CX - 120, GLOBE_CY - 140, 130
  );
  glint.addColorStop(0, "rgba(255, 255, 255, 0.16)");
  glint.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.beginPath();
  ctx.arc(GLOBE_CX, GLOBE_CY, GLOBE_R, 0, Math.PI * 2);
  ctx.fillStyle = glint;
  ctx.fill();

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
  showStatus("Looking up places near that spot...", "search");

  try {
    // First try BigDataCloud's reverse geocoder...
    let data = null;
    try {
      const url =
        "https://api.bigdatacloud.net/data/reverse-geocode-client" +
        "?latitude=" + lat + "&longitude=" + lon + "&localityLanguage=en";
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      data = await response.json();
    } catch (error) {
      // it failed — the backup below takes over
    }

    // ...and if it failed or came back empty (it has usage limits),
    // ask OpenStreetMap's reverse geocoder instead, reshaping its
    // answer to look the same.
    const gotSomething = data &&
      (data.locality || data.city || data.principalSubdivision || data.countryName);
    if (!gotSomething) {
      const url2 =
        "https://nominatim.openstreetmap.org/reverse" +
        "?lat=" + lat + "&lon=" + lon +
        "&format=jsonv2&addressdetails=1&accept-language=en&zoom=10";
      const response2 = await fetch(url2, { signal: AbortSignal.timeout(12000) });
      const j = await response2.json();
      const a = j.address || {};
      data = {
        locality: a.village || a.town || a.suburb || a.hamlet || "",
        city: a.city || a.municipality || "",
        principalSubdivision: a.state || a.province || "",
        countryName: a.country || "",
        countryCode: (a.country_code || "").toUpperCase(),
        localityInfo: {
          administrative: [
            { name: a.county || a.state_district || "", adminLevel: 6 },
          ],
        },
      };
    }

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
      showStatus("That looks like open water! Try clicking on land.", "waves");
      return;
    }

    // Remember the country for the currency suggestion later
    clickedPoint.countryName = data.countryName || "";
    clickedPoint.countryCode = data.countryCode || "";

    // Show the suggestions as clickable buttons
    hideStatus();
    suggestionsTitle.innerHTML = pickingHome
      ? icon("house") + " Places near where you clicked. Pick where you are:"
      : icon("target") + " Places near where you clicked. Pick the most precise one:";
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
    showStatus("Could not look up that spot. Please try again.", "triangle-alert");
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
      showStatus("Sorry, we couldn't find \"" + name + "\".", "frown");
      return;
    }

    await handleChosenPlace(destination);
  } catch (error) {
    showStatus("Something went wrong. Please check your connection and try again.", "triangle-alert");
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
        showStatus("Sorry, we couldn't find \"" + cityName + "\".", "frown");
        return;
      }
      pointGlobeAt(options[0].dest.latitude, options[0].dest.longitude);
      await handleChosenPlace(options[0].dest);
      return;
    }
    await handleChosenPlace(placeToDestination(data.results[0]));
  } catch (error) {
    showStatus("Something went wrong. Please check your connection and try again.", "triangle-alert");
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
  showStatus("Searching for \"" + name + "\"...", "search");

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
      showStatus("Sorry, we couldn't find \"" + name + "\". Try another spelling!", "frown");
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
    suggestionsTitle.innerHTML = icon("target") + " Several places match. Pick the exact one:";
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
    showStatus("Something went wrong. Please check your connection and try again.", "triangle-alert");
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

// Which video pixels are background? We grab the plane from a
// moment when the whole screen behind it is one flat gray,
// measured from the file as (190, 203, 209). ONLY pixels close to
// that exact colour count as background — so the plane's dark
// windows, its shiny white spots and every other detail can never
// be mistaken for background and punched out.
// The video only ever shows two backgrounds: the white first page
// (255,255,255) and the gray second page (190,203,209). Any pixel
// that sits on the straight blend between those two colours (that
// includes the soft wipe edge between them) is background. The
// plane itself is warm cream (more red than blue), so it never
// lands on that blend line.
function isVideoBackground(r, g, b) {
  const mix = Math.max(0, Math.min(1, (r - 190) / 65));
  return (
    Math.abs(r - (190 + 65 * mix)) <= 12 &&
    Math.abs(g - (203 + 52 * mix)) <= 12 &&
    Math.abs(b - (209 + 46 * mix)) <= 12
  );
}

// Exact matches for each page colour, used to check we grabbed the
// right video frame before cutting the plane out of it.
function isPageGray(r, g, b) {
  return Math.abs(r - 190) <= 10 && Math.abs(g - 203) <= 10 && Math.abs(b - 209) <= 10;
}
function isPageWhite(r, g, b) {
  return r >= 245 && g >= 245 && b >= 245;
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

  // Jump to the moment mid-wipe when the WHOLE plane is on screen
  // (later frames have its nose already off the right edge).
  // Seeking can land on the wrong frame while the video is still
  // loading, so check the frame looks right — gray page on the
  // left, white page on the right — and retry until it does.
  const W = 960, H = 540;
  const work = document.createElement("canvas");
  work.width = W;
  work.height = H;
  const ctx = work.getContext("2d", { willReadFrequently: true });

  let frame = null;
  for (const t of [0.7, 0.72, 0.66, 0.74, 0.7]) {
    video.currentTime = t;
    await new Promise(function (resolve) { video.onseeked = resolve; });
    await new Promise(function (resolve) { setTimeout(resolve, 60); });
    ctx.drawImage(video, 0, 0, W, H);
    frame = ctx.getImageData(0, 0, W, H);
    let grayHits = 0, whiteHits = 0, checks = 0;
    for (let y = 10; y < H - 10; y += 5) {
      checks++;
      let i = (y * W + 8) * 4; // a column near the left edge
      if (isPageGray(frame.data[i], frame.data[i + 1], frame.data[i + 2])) grayHits++;
      i = (y * W + 930) * 4; // a column near the right edge
      if (isPageWhite(frame.data[i], frame.data[i + 1], frame.data[i + 2])) whiteHits++;
    }
    if (grayHits > checks * 0.9 && whiteHits > checks * 0.9) break;
    frame = null;
  }
  if (!frame) throw new Error("could not reach the mid-wipe frame");
  const px = frame.data;

  // Remove the background with a "flood fill" from the picture's
  // borders: like pouring water in from every edge, it erases all
  // the gray it can flow into — even the pockets between the wings
  // and the body — while everything inside the plane's outline
  // stays untouched.

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

  // The video has a thin strip of compression junk along its right
  // and bottom edges that is neither page colour — wipe it out
  // directly and let the flood spread inward from there too.
  function forceErase(p) {
    if (visited[p]) return;
    visited[p] = 1;
    px[p * 4 + 3] = 0;
    queue.push(p);
  }
  for (let y = 0; y < H; y++) {
    for (let x = 936; x < W; x++) forceErase(y * W + x);
  }
  for (let y = 532; y < H; y++) {
    for (let x = 0; x < W; x++) forceErase(y * W + x);
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

  // Clean-up pass: the dashed flight-path line and stray specks
  // leave leftover blobs. Group the visible pixels into connected
  // "islands" and keep ONLY the biggest one — the plane.
  const island = new Int32Array(W * H); // 0 = not labelled yet
  let islandId = 0;
  const allIslands = [];
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
    allIslands.push(members);
  }
  allIslands.sort(function (a, b) { return b.length - a.length; });
  for (let k = 1; k < allIslands.length; k++) {
    for (const p of allIslands[k]) px[p * 4 + 3] = 0;
  }

  // Safety pass: make the plane SOLID. Any erased pocket that is
  // fully enclosed by the plane (not connected to the outside) gets
  // its original colour back, so the body can never be see-through.
  const outside = new Uint8Array(W * H);
  const oq = [];
  function mark(p) {
    if (outside[p] || px[p * 4 + 3] > 0) return;
    outside[p] = 1;
    oq.push(p);
  }
  for (let x = 0; x < W; x++) { mark(x); mark((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { mark(y * W); mark(y * W + W - 1); }
  while (oq.length > 0) {
    const p = oq.pop();
    const x = p % W;
    if (x > 0) mark(p - 1);
    if (x < W - 1) mark(p + 1);
    if (p >= W) mark(p - W);
    if (p < W * (H - 1)) mark(p + W);
  }
  for (let p = 0; p < W * H; p++) {
    if (px[p * 4 + 3] === 0 && !outside[p]) px[p * 4 + 3] = 255;
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
  heroCopy.querySelector("#hero-hint").innerHTML =
    icon("globe") + " Spin the globe, then click where you want to go.";
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
    weatherContent.innerHTML = "<p class='muted'>" + icon("triangle-alert") + " Could not load the weather right now.</p>";
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
      "<p>" + icon("sunrise") + " Sunrise: <strong>" + sunrise + "</strong></p>" +
      "<p>" + icon("sunset") + " Sunset: <strong>" + sunset + "</strong></p>" +
      "<p class='muted'>Local time in " + destination.name + "</p>" +
      "</div>";
  } catch (error) {
    if (destination !== currentDestination) return;
    sunContent.innerHTML = "<p class='muted'>" + icon("triangle-alert") + " Could not load sunrise and sunset times.</p>";
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
    wikiContent.innerHTML = "<p class='muted'>" + icon("triangle-alert") + " No Wikipedia information found for this destination.</p>";
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
    title: "Tourist Spots", icon: "ferris-wheel",
    max: 6,
    keywords: ["museum", "gallery", "attraction", "landmark",
      "square", "plaza", "aquarium", "zoo", "exhibition",
      "observation", "viewpoint"],
  },
  {
    key: "monuments",
    title: "Monuments", icon: "landmark",
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
    title: "Cafés & Restaurants", icon: "coffee",
    max: 6,
    keywords: ["café", "cafe", "restaurant", "brasserie", "bistro", "coffee"],
  },
  {
    key: "nature",
    title: "Nature", icon: "leaf",
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
    title: "Tourist Spots", icon: "ferris-wheel",
    max: 6,
    search: "famous tourist attractions in",
    keywords: ["attraction", "landmark", "museum", "heritage", "site",
      "hill", "beach", "island", "unesco", "resort", "entertainment",
      "square", "gallery", "zoo", "aquarium"],
  },
  {
    key: "monuments",
    title: "Monuments", icon: "landmark",
    max: 6,
    search: "famous monuments and temples in",
    keywords: ["monument", "memorial", "statue", "tomb", "ruins",
      "archaeological", "temple", "palace", "fort", "castle", "church",
      "cathedral", "basilica", "chapel", "mosque", "shrine", "stupa",
      "tower", "bridge", "cemetery", "opera", "amphitheatre"],
  },
  {
    key: "nature",
    title: "Nature", icon: "leaf",
    max: 6,
    search: "national parks waterfalls and nature in",
    keywords: ["park", "waterfall", "falls", "mountain", "lake",
      "forest", "wildlife", "sanctuary", "reserve", "hill", "river",
      "beach", "island", "garden", "valley", "gorge", "cave", "glacier"],
  },
  {
    key: "cities",
    title: "Cities to Visit", icon: "building-2",
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
  exploreNote.innerHTML = icon(isWideArea ? "sparkles" : "map") + " ";
  exploreNote.appendChild(document.createTextNode(isWideArea
    ? "Finding the highlights of " + destination.name + "..."
    : "Searching for places nearby..."));
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
      exploreNote.innerHTML =
        icon("map") + " No places found for this area. Try a nearby city instead.";
      return;
    }

    exploreNote.hidden = true;
    renderThingsToDo(ideas, categories);
  } catch (error) {
    if (destination !== currentDestination) return;
    exploreNote.innerHTML =
      icon("triangle-alert") + " Could not load places right now. Try again in a minute.";
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
    heading.innerHTML = category.icon ? icon(category.icon) + " " : "";
    heading.appendChild(document.createTextNode(category.title));
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
        "<p class='muted'>" + icon("frown") + " Couldn't find \"" + name + "\". Try a nearby city.</p>";
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
        "<p class='muted'>" + icon("check") + " Saved! Pick a destination to compare times.</p>";
    }
  } catch (error) {
    timezoneContent.innerHTML =
      "<p class='muted'>" + icon("triangle-alert") + " Could not look that up right now.</p>";
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
      diffText = icon("clock") + " Same time as " + home.name + "!";
    } else {
      diffText =
        icon("clock") + " " + destination.name + " is " + hours + "h" +
        (minutes ? " " + minutes + "m" : "") +
        (diffMinutes > 0 ? " ahead of " : " behind ") +
        (diffMinutes > 0 ? home.name : home.name);
    }

    timezoneContent.innerHTML =
      "<div class='tz-row'><span>" + icon("house") + " " + home.name + "</span>" +
      "<span class='tz-time'>" + homeTime.time + "</span></div>" +
      "<div class='tz-row'><span>" + icon("map-pin") + " " + destination.name + "</span>" +
      "<span class='tz-time'>" + destTime.time + "</span></div>" +
      "<p class='tz-diff'>" + diffText + "</p>";
  } catch (error) {
    if (destination !== currentDestination) return;
    timezoneContent.innerHTML =
      "<p class='muted'>" + icon("triangle-alert") + " Could not compare the clocks right now.</p>";
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
  { icon: "plane", label: "Flight", speed: 800 },
  { icon: "train-front", label: "Train", speed: 90 },
  { icon: "car", label: "Car", speed: 65 },
  { icon: "ship", label: "Ship", speed: 40 },
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
      "<div><span>" + icon(mode.icon) + " " + mode.label + "</span>" +
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
      "<div class='emg-row'><span>" + icon("shield") + " Police</span>" +
      "<span class='emg-number'>" + (numbers.police || "112") + "</span></div>" +
      "<div class='emg-row'><span>" + icon("ambulance") + " Ambulance</span>" +
      "<span class='emg-number'>" + (numbers.ambulance || "112") + "</span></div>" +
      "<div class='emg-row'><span>" + icon("flame") + " Fire</span>" +
      "<span class='emg-number'>" + (numbers.fire || "112") + "</span></div>" +
      "<p class='muted emg-source'>For " + destination.country +
      " · <a href='" + EMERGENCY_PAGE +
      "' target='_blank' rel='noopener'>source: Wikipedia</a></p>";
  } catch (error) {
    if (destination !== currentDestination) return;
    emergencyContent.innerHTML =
      "<p class='muted'>" + icon("triangle-alert") + " Could not load the numbers. In most countries, 112 works.</p>";
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
    convertResult.innerHTML = icon("triangle-alert") + " Could not convert right now. Try again later.";
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
    saveButton.innerHTML = icon("heart", true) + " Saved";
    saveButton.classList.add("saved");
  } else {
    saveButton.innerHTML = icon("heart") + " Save Destination";
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
    nameButton.innerHTML = icon("heart", true) + " ";
    nameButton.appendChild(document.createTextNode(trip.name));
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
    removeButton.innerHTML = icon("x");
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
// Some browsers (e.g. Macs in Low Power Mode) block videos from
// starting by themselves. If the background video was blocked,
// start it on the user's first click or key press instead.
function nudgeBackgroundVideo() {
  const bg = document.querySelector(".bg-video");
  if (bg && bg.paused) {
    bg.play().catch(function () { /* it will retry on next tap */ });
  }
}
nudgeBackgroundVideo();
document.addEventListener("pointerdown", nudgeBackgroundVideo);
document.addEventListener("keydown", nudgeBackgroundVideo);

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
loadEarthTexture(); // and the real satellite photo of Earth
startAutoSpin();    // gently spin until the user grabs it
