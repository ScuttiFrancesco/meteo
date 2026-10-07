import { IMeteoResponse } from '../models/IMeteoResponse';

export type MeteoCondition = 'Sunny' | 'Clear night' | 'Partly cloudy' | 'Cloudy' | 'Windy'
  | 'Showers' | 'Light rain' | 'Heavy rain' | 'Torrential rain' | 'Snow';

const ICONS_PATH = '/assets/img/meteo-icons/';

export const METEO_ICONS = new Map<MeteoCondition, string>([
  ['Sunny', `${ICONS_PATH}icons8-estate-96.png`],
  ['Clear night', `${ICONS_PATH}icons8-luna-piena-96.png`],
  ['Partly cloudy', `${ICONS_PATH}icons8-giorno-parzialmente-nuvoloso-96.png`],
  ['Cloudy', `${ICONS_PATH}icons8-nuovoloso-96.png`],
  ['Windy', `${ICONS_PATH}icons8-manica-a-vento-96.png`],
  ['Showers', `${ICONS_PATH}icons8-parzialmente-nuvoloso-con-pioggia-96.png`],
  ['Light rain', `${ICONS_PATH}icons8-pioggia-leggera-96.png`],
  ['Heavy rain', `${ICONS_PATH}icons8-pioggia-intensa-96.png`],
  ['Torrential rain', `${ICONS_PATH}icons8-pioggia-torrenziale-96.png`],
  ['Snow', `${ICONS_PATH}icons8-neve-96.png`],
]);

// la risposta non ha un weather code: la condizione dell'ora i si ricava dai valori hourly
// (precipitazioni in mm/h con le soglie WMO 2.5 e 7.6, raffiche in km/h, nuvolosità in %).
// La funzione condition in src/runners/runner.js ripete queste soglie per le notifiche
export function getMeteoCondition(meteo: IMeteoResponse, i: number): MeteoCondition {
  const { hourly, daily } = meteo;
  const time = hourly.time[i];
  // orari, alba e tramonto sono stringhe ISO locali ("2026-10-07T14:00"): si confrontano come testo
  const day = daily.time.indexOf(time.slice(0, 10));
  const isNight = time < daily.sunrise[day] || time > daily.sunset[day];

  if (hourly.snowfall[i] > 0) return 'Snow';
  if (hourly.precipitation[i] > 7.6) return 'Torrential rain';
  if (hourly.precipitation[i] > 2.5) return 'Heavy rain';
  if (hourly.precipitation[i] > 0) return hourly.cloudcover[i] < 70 ? 'Showers' : 'Light rain';
  if (hourly.windgusts_10m[i] > 50) return 'Windy';
  if (hourly.cloudcover[i] > 70) return 'Cloudy';
  if (isNight) return 'Clear night';
  if (hourly.cloudcover[i] > 30) return 'Partly cloudy';
  return 'Sunny';
}
