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
  if (!meteo) return;

  // ora attuale nel fuso della località, da leggere con i metodi getUTC*
  const now = new Date(Date.now() + meteo.utc_offset_seconds * 1000);

  const notifications = [];
  settings.times.forEach((time, i) => {
    const [hours, minutes] = time.split(':').map(Number);
    const at = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hours, minutes));
    if (at <= now) at.setUTCDate(at.getUTCDate() + 1);

    // daily.time contiene le date nel formato yyyy-MM-dd, nel fuso della località
    const day = meteo.daily.time.indexOf(at.toISOString().slice(0, 10));
    if (day < 0) return; // previsioni salvate troppo vecchie per quel giorno

    notifications.push({
      id: FIRST_NOTIFICATION_ID + i,
      title: `Meteo ${settings.name}`,
      body: buildBody(meteo.daily, day),
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
    + '&daily=temperature_2m_min,temperature_2m_max,precipitation_probability_max,precipitation_sum'
    + '&timezone=auto&forecast_days=3';
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

function buildBody(daily, day) {
  const min = Math.round(daily.temperature_2m_min[day]);
  const max = Math.round(daily.temperature_2m_max[day]);
  const probability = daily.precipitation_probability_max[day] ?? 0;
  const rain = daily.precipitation_sum[day] ?? 0;
  return `Oggi ${min}° / ${max}° · pioggia ${probability}% (${rain} mm)`;
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
