// Runner di Meteo Alert (vedi README, "Notifiche a orario").
// Gira in un motore JavaScript separato dalla WebView: niente Angular, localStorage o SQLite,
// solo fetch, CapacitorKV, CapacitorNotifications e poche altre API del plugin.

const SETTINGS_KEY = 'settings';
const FORECAST_KEY = 'forecast';
const FIRST_NOTIFICATION_ID = 100;
// data che non arriverà mai, usata per "annullare" una notifica programmata
const NEVER = '2100-01-01T00:00:00.000Z';

// l'app lo invia all'avvio e quando cambia il preferito selezionato
// args: { name: 'Milano', latitude: '45.46', longitude: '9.19', times: ['08:00', '17:00'] }
addEventListener('saveSettings', async (resolve, reject, args) => {
  try {
    const previous = readJson(SETTINGS_KEY);
    if (previous) cancelNotifications(args.times.length, previous.times.length);
    // le previsioni salvate valgono solo per la stessa località
    if (!previous || previous.latitude !== args.latitude || previous.longitude !== args.longitude) {
      CapacitorKV.remove(FORECAST_KEY);
    }
    CapacitorKV.set(SETTINGS_KEY, JSON.stringify(args));
    await scheduleNotifications();
    resolve();
  } catch (err) {
    console.log('[runner] saveSettings: ' + err);
    reject(err);
  }
});

// l'app lo invia quando non c'è nessun preferito selezionato
addEventListener('clearSettings', (resolve) => {
  const previous = readJson(SETTINGS_KEY);
  if (previous) cancelNotifications(0, previous.times.length);
  CapacitorKV.remove(SETTINGS_KEY);
  CapacitorKV.remove(FORECAST_KEY);
  resolve();
});

// Android lo esegue da solo circa ogni "interval" minuti (vedi capacitor.config.ts)
addEventListener('checkMeteo', async (resolve, reject) => {
  try {
    await scheduleNotifications();
    resolve();
  } catch (err) {
    console.log('[runner] checkMeteo: ' + err);
    reject(err);
  }
});

// programma una notifica per ogni orario, al prossimo passaggio di quell'ora (oggi o domani).
// Lo stesso id sostituisce la notifica già programmata, quindi ogni giro aggiorna i dati.
async function scheduleNotifications() {
  const settings = readJson(SETTINGS_KEY);
  if (!settings) return;

  const meteo = await loadForecast(settings);
  // le previsioni salvate dalle versioni precedenti del runner non hanno tutti i dati orari
  if (!meteo || !meteo.hourly || !meteo.hourly.winddirection_10m) return;

  // ora attuale nel fuso della località, da leggere con i metodi getUTC*
  const now = new Date(Date.now() + meteo.utc_offset_seconds * 1000);

  const notifications = [];
  settings.times.forEach((time, i) => {
    const [hours, minutes] = time.split(':').map(Number);
    const at = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hours, minutes));
    if (at <= now) at.setUTCDate(at.getUTCDate() + 1);
    const dayBefore = new Date(at);
    dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);

    const today = hourIndex(meteo, at);
    const yesterday = hourIndex(meteo, dayBefore);
    if (today < 0 || yesterday < 0) return; // previsioni salvate troppo vecchie per quel giorno

    notifications.push({
      id: FIRST_NOTIFICATION_ID + i,
      title: `Meteo ${settings.name} · ieri → oggi`,
      ...buildComparison(meteo, yesterday, today),
      // il plugin legge questa data come ora locale del telefono e ignora la "Z" (vedi README)
      scheduleAt: at.toISOString(),
    });
  });

  if (notifications.length) CapacitorNotifications.schedule(notifications);
  console.log(`[runner] programmate ${notifications.length} notifiche per ${settings.name}`);
}

async function loadForecast(settings) {
  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${settings.latitude}&longitude=${settings.longitude}`
    + '&hourly=temperature_2m,apparent_temperature,precipitation,snowfall,cloudcover,windspeed_10m,windgusts_10m,winddirection_10m'
    + '&daily=sunrise,sunset'
    // past_days=1 per avere anche ieri, da confrontare con oggi
    + '&timezone=auto&past_days=1&forecast_days=3';
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const meteo = await response.json();
    CapacitorKV.set(FORECAST_KEY, JSON.stringify(meteo));
    return meteo;
  } catch (err) {
    // senza rete usiamo le ultime previsioni scaricate, se coprono ancora il giorno della notifica
    console.log('[runner] previsioni non scaricate, uso quelle salvate: ' + err);
    return readJson(FORECAST_KEY);
  }
}

// hourly.time contiene le ore nel formato yyyy-MM-ddTHH:00, nel fuso della località:
// la notifica usa l'ora piena (alle 8:30 i dati delle 8:00)
function hourIndex(meteo, date) {
  return meteo.hourly.time.indexOf(date.toISOString().slice(0, 13) + ':00');
}

// ogni dato è "valore di ieri → valore di oggi", alla stessa ora
function buildComparison(meteo, yesterday, today) {
  const hourly = meteo.hourly;
  const degrees = (value) => `${Math.round(value)}°`;
  const compare = (key, format) => `${format(hourly[key][yesterday])} → ${format(hourly[key][today])}`;
  const wind = (i) => `${Math.round(hourly.windspeed_10m[i])} km/h ${windDirection(hourly.winddirection_10m[i])}`;

  const weather = `${condition(meteo, yesterday)} → ${condition(meteo, today)}`;
  const temperature = compare('temperature_2m', degrees);
  return {
    // notifica chiusa: una riga sola
    body: `${temperature} · ${weather}`,
    // notifica espansa: il plugin la mostra solo con la patch in patches/ (vedi README)
    largeBody: [
      `Meteo: ${weather}`,
      `Temperatura: ${temperature}`,
      `Percepita: ${compare('apparent_temperature', degrees)}`,
      `Vento: ${wind(yesterday)} → ${wind(today)}`,
    ].join('\n'),
  };
}

// stessa logica di windDirection in src/app/shared/wind.ts
function windDirection(degrees) {
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(degrees / 45) % 8];
}

// stessa logica di getMeteoCondition in src/app/shared/meteo-icons.ts, con le etichette in italiano
function condition(meteo, i) {
  const { hourly, daily } = meteo;
  const time = hourly.time[i];
  const day = daily.time.indexOf(time.slice(0, 10));
  const isNight = time < daily.sunrise[day] || time > daily.sunset[day];

  if (hourly.snowfall[i] > 0) return 'Neve';
  if (hourly.precipitation[i] > 7.6) return 'Pioggia torrenziale';
  if (hourly.precipitation[i] > 2.5) return 'Pioggia forte';
  if (hourly.precipitation[i] > 0) return hourly.cloudcover[i] < 70 ? 'Rovesci' : 'Pioggia leggera';
  if (hourly.windgusts_10m[i] > 50) return 'Ventoso';
  if (hourly.cloudcover[i] > 70) return 'Nuvoloso';
  if (isNight) return 'Sereno';
  if (hourly.cloudcover[i] > 30) return 'Parz. nuvoloso';
  return 'Soleggiato';
}

// il plugin non ha un'API per annullare una notifica programmata:
// la riprogrammiamo con lo stesso id in una data che non arriverà mai
function cancelNotifications(fromIndex, toIndex) {
  const notifications = [];
  for (let i = fromIndex; i < toIndex; i++) {
    notifications.push({ id: FIRST_NOTIFICATION_ID + i, title: '', body: '', scheduleAt: NEVER });
  }
  if (notifications.length) CapacitorNotifications.schedule(notifications);
}

function readJson(key) {
  const saved = CapacitorKV.get(key);
  return saved && saved.value ? JSON.parse(saved.value) : null;
}
