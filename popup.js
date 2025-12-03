// Script for popup.html — fetches weather and updates the UI using free APIs (Nominatim + Open-Meteo)

const $ = (sel) => document.querySelector(sel);
const form = $('#weather-form');
const cityInput = $('#city-input');
const fetchBtn = $('#fetch-btn');
const loadingEl = $('#loading');
const errorEl = $('#error');
const resultEl = $('#result');
const cityNameEl = $('#city-name');
const tempEl = $('#temperature');
const condsEl = $('#conditions');
const forecastEl = $('#forecast');

function setLoading(isLoading){
  loadingEl.classList.toggle('hidden', !isLoading);
  fetchBtn.disabled = isLoading;
}

function showError(msg){
  errorEl.textContent = msg;
  errorEl.classList.toggle('hidden', !msg);
}

function getWeatherIcon(code){
  // Return a simple emoji icon for the given Open-Meteo weather code
  if(code === 0) return '☀️';
  if(code === 1 || code === 2) return '⛅';
  if(code === 3) return '☁️';
  if(code === 45 || code === 48) return '🌫️';
  if((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return '🌧️';
  if((code >= 71 && code <= 77) || (code === 85) || (code === 86)) return '🌨️';
  if(code >= 95) return '⛈️';
  return '🌈';
}

function showResult(data){
  if(!data) { resultEl.classList.add('hidden'); return; }
  cityNameEl.textContent = data.display_name || (data.name || '');
  // include icon in the current temperature
  const icon = data.currentCode != null ? getWeatherIcon(data.currentCode) : '';
  tempEl.innerHTML = `<span class="icon" aria-hidden="true">${icon}</span><span class="temp-val">${Math.round(data.currentTemp)}°C</span>`;
  condsEl.textContent = data.currentDesc || '';
  renderForecast(data.daily);
  resultEl.classList.remove('hidden');
}

function renderForecast(daily){
  forecastEl.innerHTML = '';
  if(!daily || !daily.time) return;
  // daily contains arrays: time[], weathercode[], temperature_2m_max[], temperature_2m_min[]
  for(let i=0;i<daily.time.length;i++){
    const time = daily.time[i];
    const date = new Date(time);
    const label = i===0 ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'short' });
    const code = daily.weathercode[i];
    const max = Math.round(daily.temperature_2m_max[i]);
    const min = Math.round(daily.temperature_2m_min[i]);
    const desc = WEATHER_CODE_MAP.hasOwnProperty(code) ? WEATHER_CODE_MAP[code] : `Code ${code}`;

    const icon = getWeatherIcon(code);
    const card = document.createElement('div');
    card.className = 'forecast-card';
    card.innerHTML = `<div class="f-day">${label}</div><div class="f-icon" aria-hidden="true">${icon}</div><div class="f-desc">${desc}</div><div class="f-temps"><span class="f-max">${max}°</span><span class="f-min">${min}°</span></div>`;
    forecastEl.appendChild(card);
  }
}

// Map Open-Meteo weathercode to simple description (not exhaustive)
const WEATHER_CODE_MAP = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail'
};

async function geocodeCity(city){
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`;
  const resp = await fetch(url, {headers: { 'User-Agent': 'OpenWeatherChromeExt/1.0 (you@example.com)' }});
  if(!resp.ok) throw new Error(`Geocoding failed: ${resp.status} ${resp.statusText}`);
  const arr = await resp.json();
  if(!arr || arr.length === 0) throw new Error('Location not found');
  return arr[0];
}

async function fetchWeatherFromOpenMeteo(lat, lon){
  // Request current_weather and daily forecast for next 7 days
  // daily parameters: weathercode, temperature_2m_max, temperature_2m_min
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=8`;
  const resp = await fetch(url);
  if(!resp.ok) throw new Error(`Weather fetch failed: ${resp.status} ${resp.statusText}`);
  const body = await resp.json();
  if(!body) throw new Error('No weather data returned');
  // current_weather and daily
  return body;
}

function saveLastCity(city){
  try{ chrome.storage.local.set({ lastCity: city }); }catch(e){ /* ignore */ }
}

function loadLastCity(){
  try{
    chrome.storage.local.get(['lastCity'], (items) => {
      if(items && items.lastCity){
        cityInput.value = items.lastCity;
      }
    });
  }catch(e){ /* ignore */ }
}

async function fetchAndDisplay(city){
  setLoading(true);
  showError('');
  showResult(null);
  try{
    const place = await geocodeCity(city);
    const lat = place.lat;
    const lon = place.lon;
    const body = await fetchWeatherFromOpenMeteo(lat, lon);

    // build data
    const current = body.current_weather || {};
    const daily = body.daily || {};
    const code = current.weathercode;
    const desc = WEATHER_CODE_MAP.hasOwnProperty(code) ? WEATHER_CODE_MAP[code] : `Weather code ${code}`;

    const data = {
      display_name: place.display_name,
      currentTemp: current.temperature,
      currentDesc: desc,
      currentCode: code,
      daily: daily
    };

    showResult(data);
    saveLastCity(city);
  }catch(err){
    console.error(err);
    showError(err.message || 'Failed to fetch weather.');
  }finally{
    setLoading(false);
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if(!city){ showError('Please enter a city name.'); return; }
  fetchAndDisplay(city);
});

cityInput.addEventListener('keydown', (e) => {
  if(e.key === 'Enter'){
    e.preventDefault();
    form.dispatchEvent(new Event('submit'));
  }
});

window.addEventListener('DOMContentLoaded', () => {
  cityInput.focus();
  loadLastCity();
});
