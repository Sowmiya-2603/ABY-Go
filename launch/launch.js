/* ============================================================
   ABY Go launch site
   Small, dependency-free touches: a starfield, scroll reveals,
   live sample cards (Paris weather, clocks, currency), the film
   switcher, the embedded live app, a QR code and share buttons.
   ============================================================ */

const APP_URL = "https://aby-go.vercel.app/";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ---------- Starfield ---------- */
(function starfield() {
  const canvas = $("#stars");
  const ctx = canvas.getContext("2d");
  let stars = [], shooting = null, w, h, dpr;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width = innerWidth * dpr;
    h = canvas.height = innerHeight * dpr;
    const count = Math.round((innerWidth * innerHeight) / 2600);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: (Math.random() * 1.1 + 0.25) * dpr,
      a: Math.random() * 0.7 + 0.2,
      speed: Math.random() * 0.002 + 0.0006,
      phase: Math.random() * Math.PI * 2,
      tint: Math.random() < 0.15 ? "200,220,255" : Math.random() < 0.08 ? "255,225,180" : "255,255,255",
    }));
  }

  function draw(t) {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      const tw = reduceMotion ? 1 : 0.65 + 0.35 * Math.sin(t * s.speed + s.phase);
      ctx.fillStyle = `rgba(${s.tint},${s.a * tw})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Now and then a shooting star crosses the sky
    if (!reduceMotion) {
      if (!shooting && Math.random() < 0.004) {
        shooting = { x: Math.random() * w * 0.7, y: Math.random() * h * 0.4, life: 0 };
      }
      if (shooting) {
        const s = shooting, len = 120 * dpr, p = s.life / 50;
        const x = s.x + s.life * 14 * dpr, y = s.y + s.life * 6 * dpr;
        const g = ctx.createLinearGradient(x, y, x - len, y - len * 0.43);
        g.addColorStop(0, `rgba(255,255,255,${0.9 * (1 - p)})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.6 * dpr;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - len, y - len * 0.43); ctx.stroke();
        if (++s.life > 50) shooting = null;
      }
      requestAnimationFrame(draw);
    }
  }

  resize();
  addEventListener("resize", () => { resize(); if (reduceMotion) draw(0); });
  requestAnimationFrame(draw);
})();

/* ---------- Nav background once you scroll ---------- */
const nav = $("#nav");
const onScroll = () => nav.classList.toggle("scrolled", scrollY > 30);
addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ---------- Reveal on scroll ---------- */
const revealer = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add("in");
    revealer.unobserve(e.target);
  }
}, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
$$("main .reveal").forEach((el, i) => {
  // Neighbours in the same row come in one after another
  el.style.transitionDelay = (i % 4) * 70 + "ms";
  revealer.observe(el);
});

/* ---------- Seven tabs collapse into one ---------- */
const stage = $("#tab-stage");
new IntersectionObserver((entries, obs) => {
  if (!entries[0].isIntersecting) return;
  stage.classList.add("in");
  setTimeout(() => stage.classList.add("gather"), reduceMotion ? 0 : 2800);
  obs.disconnect();
}, { threshold: 0.5 }).observe(stage);

/* ---------- Time helpers ---------- */
// Hours, minutes, seconds and the short zone name in any time zone
function zoned(tz, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23", timeZoneName: "short",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const v = { h: +get("hour"), m: +get("minute"), s: +get("second"), name: get("timeZoneName") };
  // Minutes ahead of UTC, used for the "behind / ahead" sentence
  const asUTC = Date.UTC(+get("year"), +get("month") - 1, +get("day"), v.h, v.m, v.s);
  v.offset = Math.round((asUTC - date.getTime()) / 60000);
  return v;
}
const pad = (n) => String(n).padStart(2, "0");
const hm = (mins) => `${Math.floor(mins / 60)} h ${pad(mins % 60)} m`;

/* ---------- Live clocks: Chennai and Paris ---------- */
function setDial(dial, t) {
  const [h, m, s] = $$("i", dial);
  h.style.transform = `rotate(${(t.h % 12) * 30 + t.m * 0.5}deg)`;
  m.style.transform = `rotate(${t.m * 6 + t.s * 0.1}deg)`;
  s.style.transform = `rotate(${t.s * 6}deg)`;
}
function tickClocks() {
  const a = zoned("Asia/Kolkata"), b = zoned("Europe/Paris");
  $("#time-a").textContent = `${pad(a.h)}:${pad(a.m)}`;
  $("#time-b").textContent = `${pad(b.h)}:${pad(b.m)}`;
  $("#tz-b").textContent = b.name.startsWith("GMT") ? "CET" : b.name;
  setDial($("#dial-a"), a);
  setDial($("#dial-b"), b);
  const diff = a.offset - b.offset;
  $("#time-diff").innerHTML = `Paris is <b>${hm(Math.abs(diff))}</b> ${diff >= 0 ? "behind" : "ahead of"} Chennai`;
}
tickClocks();
setInterval(tickClocks, 1000);

/* ---------- Distance count-up ---------- */
const counter = $(".count");
new IntersectionObserver((entries, obs) => {
  if (!entries[0].isIntersecting) return;
  obs.disconnect();
  if (reduceMotion) return;
  const to = +counter.dataset.to, start = performance.now(), dur = 1600;
  (function step(now) {
    const p = Math.min((now - start) / dur, 1), e = 1 - Math.pow(1 - p, 3);
    counter.textContent = Math.round(to * e).toLocaleString("en-US");
    if (p < 1) requestAnimationFrame(step);
  })(start);
}, { threshold: 0.6 }).observe(counter);

/* ---------- Live Paris weather + sunrise/sunset (Open-Meteo) ---------- */
const WEATHER = [
  [[0], "Clear sky", "sun"],
  [[1], "Mainly clear", "cloud-sun"],
  [[2], "Partly cloudy", "cloud-sun"],
  [[3], "Overcast", "cloud"],
  [[45, 48], "Foggy", "cloud"],
  [[51, 53, 55, 56, 57], "Drizzle", "cloud-rain"],
  [[61, 63, 65, 66, 67, 80, 81, 82], "Rain", "cloud-rain"],
  [[71, 73, 75, 77, 85, 86], "Snow", "cloud"],
  [[95, 96, 99], "Thunderstorm", "cloud-rain"],
];
const describe = (code) => WEATHER.find(([codes]) => codes.includes(code)) || WEATHER[2];
const setLive = (key, text) => $$(`[data-live="${key}"]`).forEach((el) => (el.textContent = text));
const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

// Moves the little sun along its arc for the current time in Paris
function placeSun(sunrise, sunset) {
  const now = zoned("Europe/Paris"), nowMin = now.h * 60 + now.m;
  const p = Math.max(0, Math.min(1, (nowMin - toMin(sunrise)) / (toMin(sunset) - toMin(sunrise))));
  const arc = $("#arc-fg"), len = arc.getTotalLength();
  arc.style.strokeDasharray = `${len * p} ${len}`;
  const pt = arc.getPointAtLength(len * p);
  const dot = $("#sun-dot");
  dot.setAttribute("cx", pt.x);
  dot.setAttribute("cy", pt.y);
  dot.style.opacity = p > 0 && p < 1 ? 1 : 0.35;
  setLive("daylength", hm(toMin(sunset) - toMin(sunrise)));
}

async function loadWeather() {
  placeSun("08:12", "18:59"); // sample, until the live answer arrives
  try {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522" +
      "&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset" +
      "&timezone=Europe%2FParis&forecast_days=4";
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.reason || res.status);
    const c = data.current, d = data.daily;
    const [, label, icon] = describe(c.weather_code);
    setLive("temp", Math.round(c.temperature_2m));
    setLive("feels", Math.round(c.apparent_temperature));
    setLive("hum", Math.round(c.relative_humidity_2m));
    setLive("wind", Math.round(c.wind_speed_10m));
    setLive("cond", label);
    setLive("day", "Now");
    $$('[data-live="icon"] use').forEach((u) => u.setAttribute("href", "#i-" + icon));

    const dayName = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short" });
    $('[data-live="forecast"]').innerHTML = [1, 2, 3].map((i) =>
      `<span>${dayName(d.time[i])} <b>${Math.round(d.temperature_2m_max[i])}° / ${Math.round(d.temperature_2m_min[i])}°</b></span>`
    ).join("");

    const sunrise = d.sunrise[0].slice(11, 16), sunset = d.sunset[0].slice(11, 16);
    setLive("sunrise", sunrise);
    setLive("sunset", sunset);
    placeSun(sunrise, sunset);
    setLive("note", "Live right now from Open-Meteo.");
  } catch {
    // Keep the sample values already on the page
  }
}
loadWeather();

/* ---------- Currency converter (Frankfurter, same as the app) ---------- */
let inrToEur = 0.00939; // fallback; replaced by the live rate
const fxIn = $("#fx-in"), fxOut = $("#fx-out");
function convert() {
  const amount = parseFloat(fxIn.value) || 0;
  fxOut.textContent = "€ " + (amount * inrToEur).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
fxIn.addEventListener("input", convert);
convert();
fetch("https://api.frankfurter.dev/v1/latest?from=INR&to=EUR")
  .then((r) => r.json())
  .then((data) => {
    if (!data.rates?.EUR) return;
    inrToEur = data.rates.EUR;
    convert();
    $("#fx-note").textContent = `Live rate from Frankfurter · ${data.date}`;
  })
  .catch(() => {});

/* ---------- Things to explore ---------- */
const SPOTS = {
  sights: { icon: "landmark", items: [
    ["Eiffel Tower", "Champ de Mars", "Landmark"],
    ["Arc de Triomphe", "Top of the Champs-Élysées", "Monument"],
    ["Notre-Dame de Paris", "Île de la Cité", "Cathedral"],
    ["Sacré-Cœur", "Montmartre hilltop", "Basilica"],
  ]},
  museums: { icon: "landmark", items: [
    ["Louvre Museum", "Home of the Mona Lisa", "Museum"],
    ["Musée d'Orsay", "Impressionists in a railway station", "Museum"],
    ["Centre Pompidou", "Modern and contemporary art", "Museum"],
    ["Musée Rodin", "Sculpture garden", "Museum"],
  ]},
  cafes: { icon: "coffee", items: [
    ["Café de Flore", "Saint-Germain-des-Prés", "Café"],
    ["Les Deux Magots", "Saint-Germain-des-Prés", "Café"],
    ["Angelina", "Rue de Rivoli", "Tea room"],
    ["Le Procope", "Since 1686", "Restaurant"],
  ]},
  nature: { icon: "leaf", items: [
    ["Jardin du Luxembourg", "6th arrondissement", "Garden"],
    ["Tuileries Garden", "Beside the Louvre", "Garden"],
    ["Parc des Buttes-Chaumont", "19th arrondissement", "Park"],
    ["Bois de Boulogne", "Western edge of Paris", "Woodland"],
  ]},
};
function showSpots(kind) {
  const { icon, items } = SPOTS[kind];
  $("#spots").innerHTML = items.map(([name, sub, tag], i) =>
    `<li style="animation-delay:${i * 60}ms"><svg class="i"><use href="#i-${icon}"/></svg>` +
    `<div><b>${name}</b><small>${sub}</small></div><em>${tag}</em></li>`
  ).join("");
}
$$(".filter button").forEach((btn) => btn.addEventListener("click", () => {
  $$(".filter button").forEach((b) => b.classList.toggle("on", b === btn));
  showSpots(btn.dataset.kind);
}));
showSpots("sights");

/* ---------- My Trips hearts ---------- */
$$("#trips button").forEach((btn) => btn.addEventListener("click", () => {
  const saved = !btn.classList.contains("saved");
  btn.classList.toggle("saved", saved);
  btn.setAttribute("aria-pressed", saved);
  btn.classList.remove("pop"); void btn.offsetWidth; btn.classList.add("pop");
  const label = btn.parentElement.querySelector("em");
  $$("#trips .fresh").forEach((b) => { b.classList.remove("fresh"); b.parentElement.querySelector("em").textContent = "Saved"; });
  if (saved) { btn.classList.add("fresh"); label.textContent = "Just saved"; }
  else label.textContent = "";
}));

/* ---------- Film switcher ---------- */
const FILMS = {
  launch: { src: "assets/launch-film.mp4", poster: "assets/poster-launch.jpg" },
  motion: { src: "assets/motion-film.mp4", poster: "assets/poster-motion.jpg" },
  demo:   { src: "assets/product-demo.mp4", poster: "assets/poster-demo.jpg" },
};
const film = $("#film");
function selectFilm(key, autoplay) {
  $$(".film-tab").forEach((t) => {
    const on = t.dataset.film === key;
    t.classList.toggle("on", on);
    t.setAttribute("aria-selected", on);
  });
  if (!film.src.endsWith(FILMS[key].src)) {
    film.poster = FILMS[key].poster;
    film.src = FILMS[key].src;
  }
  if (autoplay) film.play().catch(() => {});
}
$$(".film-tab").forEach((t) => t.addEventListener("click", () => selectFilm(t.dataset.film, true)));
$$("[data-play]").forEach((a) => a.addEventListener("click", () => selectFilm(a.dataset.play, true)));

/* ---------- Live app inside the laptop frame ---------- */
$("#load-app").addEventListener("click", function () {
  const frame = document.createElement("iframe");
  frame.src = APP_URL;
  frame.title = "ABY Go, the live app";
  frame.allow = "geolocation; clipboard-write";
  this.replaceWith(frame);
});

/* ---------- QR code, copy and share ---------- */
if (window.QRCode) {
  new QRCode($("#qr"), {
    text: APP_URL, width: 352, height: 352,
    colorDark: "#0a1428", colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M,
  });
} else {
  $(".qr-card").hidden = true;
}

async function copyLink(btn) {
  const label = btn.querySelector("span");
  const before = label.textContent;
  try { await navigator.clipboard.writeText(APP_URL); label.textContent = "Copied!"; }
  catch { label.textContent = "Copy failed"; }
  setTimeout(() => (label.textContent = before), 1800);
}
$("#copy-link").addEventListener("click", function () { copyLink(this); });
$("#share").addEventListener("click", async function () {
  if (navigator.share) {
    try {
      await navigator.share({ title: "ABY Go", text: "All Before You Go: seven travel answers on one screen.", url: APP_URL });
    } catch { /* closed the share sheet */ }
  } else {
    copyLink(this);
  }
});

$("#year").textContent = new Date().getFullYear();
