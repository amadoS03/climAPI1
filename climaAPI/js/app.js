const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

// Traducción simplificada de los códigos WMO usados por Open-Meteo
const WEATHER_CODES = {
  0: { desc: "Despejado", icon: "☀️" },
  1: { desc: "Mayormente despejado", icon: "🌤️" },
  2: { desc: "Parcialmente nublado", icon: "⛅" },
  3: { desc: "Nublado", icon: "☁️" },
  45: { desc: "Niebla", icon: "🌫️" },
  48: { desc: "Niebla helada", icon: "🌫️" },
  51: { desc: "Llovizna ligera", icon: "🌦️" },
  53: { desc: "Llovizna", icon: "🌦️" },
  55: { desc: "Llovizna intensa", icon: "🌧️" },
  61: { desc: "Lluvia ligera", icon: "🌧️" },
  63: { desc: "Lluvia", icon: "🌧️" },
  65: { desc: "Lluvia intensa", icon: "🌧️" },
  71: { desc: "Nieve ligera", icon: "🌨️" },
  73: { desc: "Nieve", icon: "🌨️" },
  75: { desc: "Nieve intensa", icon: "❄️" },
  80: { desc: "Chubascos", icon: "🌦️" },
  81: { desc: "Chubascos fuertes", icon: "🌧️" },
  82: { desc: "Chubascos violentos", icon: "⛈️" },
  95: { desc: "Tormenta eléctrica", icon: "⛈️" },
  96: { desc: "Tormenta con granizo", icon: "⛈️" },
};
function weatherInfo(code) {
  return WEATHER_CODES[code] || { desc: "N/D", icon: "❔" };
}

const els = {
  form: document.getElementById("search-form"),
  input: document.getElementById("city-input"),
  loading: document.getElementById("loading"),
  loadingText: document.querySelector("#loading p"),
  errorBox: document.getElementById("error-box"),
  errorMsg: document.getElementById("error-message"),
  retryBtn: document.getElementById("retry-btn"),
  results: document.getElementById("results"),
  locationName: document.getElementById("location-name"),
  summary: document.getElementById("current-summary"),
  currentCategory: document.getElementById("current-category"),
  resultCount: document.getElementById("result-count"),
  grid: document.getElementById("item-grid"),
};

let forecastData = null;
let lastCity = "Ciudad de México";

/* ---------- Utilidades de UI ---------- */
function showLoading(show, city) {
  els.loading.hidden = !show;
  els.results.hidden = show;
  els.errorBox.hidden = true;
  if (show && city) els.loadingText.textContent = `Buscando ciudad "${city}"...`;
}
function showError(show, msg) {
  els.errorBox.hidden = !show;
  els.loading.hidden = true;
  if (msg) els.errorMsg.textContent = msg;
}

/* ---------- Render del resumen actual ---------- */
function renderSummary() {
  const c = forecastData.current;
  const info = weatherInfo(c.weather_code);
  els.summary.innerHTML = `
    <div>
      <div class="current-summary__temp">${Math.round(c.temperature_2m)}°C</div>
      <div class="current-summary__desc">${info.desc}</div>
    </div>
    <div class="current-summary__icon">${info.icon}</div>
    <div class="current-summary__details">
      <span>💧 Humedad: ${c.relative_humidity_2m}%</span>
      <span>💨 Viento: ${Math.round(c.wind_speed_10m)} km/h</span>
    </div>
  `;
}

/* ---------- Render de ítems según categoría ---------- */
function renderItems(category) {
  els.grid.innerHTML = "";
  let items = [];

  if (category === "actual") {
    const info = weatherInfo(forecastData.current.weather_code);
    items = [{
      label: "Ahora",
      icon: info.icon,
      temp: `${Math.round(forecastData.current.temperature_2m)}°C`,
      sub: info.desc,
    }];
    els.currentCategory.textContent = "Clima Actual";
  }

  if (category === "horas") {
    const h = forecastData.hourly;
    const nowIndex = h.time.findIndex((t) => t === forecastData.current.time.slice(0, 13) + ":00") || 0;
    const start = Math.max(nowIndex, 0);
    for (let i = start; i < start + 24 && i < h.time.length; i++) {
      const info = weatherInfo(h.weather_code[i]);
      const hour = new Date(h.time[i]).getHours();
      items.push({ label: `${hour}:00`, icon: info.icon, temp: `${Math.round(h.temperature_2m[i])}°C`, sub: info.desc });
    }
    els.currentCategory.textContent = "Pronóstico por Horas (24h)";
  }

  if (category === "dias") {
    const d = forecastData.daily;
    const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    for (let i = 0; i < d.time.length; i++) {
      const info = weatherInfo(d.weather_code[i]);
      const date = new Date(d.time[i] + "T00:00:00");
      const label = i === 0 ? "Hoy" : dayNames[date.getDay()];
      items.push({
        label,
        icon: info.icon,
        temp: `${Math.round(d.temperature_2m_max[i])}° / ${Math.round(d.temperature_2m_min[i])}°`,
        sub: info.desc,
      });
    }
    els.currentCategory.textContent = "Pronóstico — Próximos 7 Días";
  }

  els.resultCount.textContent = `${items.length} elemento(s)`;
  items.forEach((it) => {
    const card = document.createElement("article");
    card.className = "item-card";
    card.innerHTML = `
      <div class="item-card__label">${it.label}</div>
      <div class="item-card__icon">${it.icon}</div>
      <div class="item-card__temp">${it.temp}</div>
      <div class="item-card__sub">${it.sub}</div>
    `;
    els.grid.appendChild(card);
  });
}

function filterByCategory(category) {
  renderItems(category);
}

/* ---------- Llamadas a la API ---------- */
async function loadCity(city) {
  lastCity = city;
  showLoading(true, city);
  try {
    // 1. Geocodificar el nombre de la ciudad a lat/lon
    const geoRes = await fetch(`${GEO_URL}?name=${encodeURIComponent(city)}&count=1&language=es`);
    if (!geoRes.ok) throw new Error("Fallo en geocodificación");
    const geoData = await geoRes.json();
    if (!geoData.results || geoData.results.length === 0) {
      throw new Error(`No se encontró la ciudad "${city}".`);
    }
    const { latitude, longitude, name, country } = geoData.results[0];

    // 2. Obtener el pronóstico (actual + horario + diario) en una sola llamada
    const params = new URLSearchParams({
      latitude,
      longitude,
      current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
      hourly: "temperature_2m,weather_code",
      daily: "temperature_2m_max,temperature_2m_min,weather_code",
      timezone: "auto",
      forecast_days: 7,
    });
    const forecastRes = await fetch(`${FORECAST_URL}?${params}`);
    if (!forecastRes.ok) throw new Error("Fallo al consultar el pronóstico");
    forecastData = await forecastRes.json();

    els.locationName.textContent = `📍 ${name}, ${country}`;
    renderSummary();

    const activeBtn = document.querySelector(".cat-btn.active");
    renderItems(activeBtn ? activeBtn.dataset.category : "actual");

    showLoading(false);
  } catch (err) {
    console.error("Error al consumir la API:", err);
    showError(true, err.message || "Ocurrió un error al obtener los datos del clima.");
  }
}

/* ---------- Eventos ---------- */
els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = els.input.value.trim();
  if (city) loadCity(city);
});

document.querySelectorAll(".cat-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".cat-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    filterByCategory(btn.dataset.category);
  });
});

document.querySelectorAll(".city-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    els.input.value = btn.dataset.city;
    loadCity(btn.dataset.city);
  });
});

els.retryBtn.addEventListener("click", () => loadCity(lastCity));

document.addEventListener("DOMContentLoaded", () => loadCity(lastCity));
