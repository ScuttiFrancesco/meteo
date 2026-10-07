import { Component, computed, effect, inject, signal } from '@angular/core';
import { formatDate } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonButton, IonIcon, IonRouterLink, IonSpinner, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircleOutline, compassOutline, heartOutline, locationOutline, moonOutline, searchOutline, sunnyOutline } from 'ionicons/icons';
import { StorageService } from '../core/services/storage.service';
import { ApiService } from '../core/services/api.service';
import { getMeteoCondition, METEO_ICONS } from '../shared/meteo-icons';
import { HourlyMeteoModalComponent } from './hourly-meteo-modal.component';

// etichette dei giorni nell'ordine di daily.time (chiediamo da 2 giorni fa a fra 3 giorni)
const DAY_LABELS = ['2 days ago', 'Yesterday', 'Today', 'Tomorrow', 'In 2 days', 'In 3 days'];

// data locale in formato yyyy-MM-dd, come richiesto da open-meteo (offset negativo = giorni passati)
function dayFromToday(offset: number): string {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return formatDate(date, 'yyyy-MM-dd', 'en-US')
}

@Component({
  imports: [RouterLink, IonRouterLink, IonButton, IonIcon, IonSpinner],
  selector: 'fra-home',
  styles: `
  :host {
    /* stessa palette delle favorite card: superficie chiara e testo scuro in entrambi i temi */
    --fra-surface: rgba(255, 239, 239, 0.82);
    --fra-surface-border: rgba(255, 255, 255, 0.7);
    --fra-text: #1d1d1f;
    --fra-muted: rgba(0, 0, 0, 0.55);
    --fra-accent: #5012b4;
    display: block;
    height: 100%;
  }
  #container {
    position: relative;
    display: flex;
    justify-content: start;
    align-items: center;
    flex-direction: column;
    height: 100%;
    padding: 16px;
    padding-bottom: calc(20vh + 16px);
  }
  .glass {
    color: var(--fra-text);
    background: var(--fra-surface);
    border: 1px solid var(--fra-surface-border);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  }
  .card-info {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    width: 100%;
  }
  .country {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 600;
    background: rgba(0, 0, 0, 0.06);
  }
  .country img {
    height: 1.1em;
    border-radius: 3px;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
  }
  .card {
    width: 100%;
    max-width: 420px;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px 20px;
    text-align: center;
    border-radius: 24px;
    animation: fade-in 0.4s ease both;
  }
  .road {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--fra-muted);
  }
  .road ion-icon {
    font-size: 18px;
    color: var(--fra-accent);
  }
  h1 {
    margin: 4px 0;
    font-size: clamp(36px, 10vw, 52px);
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -0.02em;
  }
  .region {
    margin: 0;
    font-size: 15px;
    color: var(--fra-muted);
  }
  .current {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .temperature {
    font-size: clamp(32px, 9vw, 48px);
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .meteo-icon {
    height: clamp(100px, 20vw, 180px);
    margin: 8px 0 8px;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25));
    animation: float 4s ease-in-out infinite;
  }
  .coords {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--fra-accent);
    background: rgba(104, 21, 236, 0.1);
  }
  .state {
    gap: 8px;
  }
  .state > ion-icon {
    font-size: 56px;
    color: var(--fra-accent);
  }
  .state h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
  }
  .state p {
    margin: 0;
    color: var(--fra-muted);
  }
  .state ion-spinner {
    --color: var(--fra-accent);
    width: 40px;
    height: 40px;
  }
  .state ion-button {
    margin-top: 8px;
    --background: var(--fra-accent);
    --border-radius: 12px;
  }
  .footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    height: 17vh;
    color: black;
    background-color: rgba(255, 239, 239, 0.92);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-top: 1px solid var(--fra-surface-border);
    border-radius: 24px 24px 0 0;
    box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.18);
    transition: height 0.3s ease;
  }
  .footer.expanded {
    height: 32vh;
  }
  .footer-handle {
    width: 100%;
    padding: 12px 0;
    background: none;
    border: none;
    cursor: pointer;
  }
  .footer-handle::before {
    content: '';
    display: block;
    width: 48px;
    height: 5px;
    margin: 0 auto;
    border-radius: 3px;
    background-color: rgba(0, 0, 0, 0.2);
  }
  .footer-content {
    flex: 1;
    overflow-y: auto;
    padding: 0 16px calc(16px + env(safe-area-inset-bottom));
  }
  .footer-state {
    margin: 0;
    text-align: center;
    color: var(--fra-muted);
  }
  .days {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .day {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 4px;
    font: inherit;
    font-size: 13px;
    color: inherit;
    background: rgba(0, 0, 0, 0.05);
    border: none;
    border-radius: 16px;
    cursor: pointer;
  }
  .day-label {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--fra-accent);
  }
  .day-temp {
    font-size: 16px;
    font-weight: 700;
  }
  .day-feels {
    color: var(--fra-muted);
  }
  .day ion-icon {
    margin-inline-end: 4px;
    vertical-align: -2px;
  }
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: none; }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  @media (prefers-reduced-motion: reduce) {
    .card, .meteo-icon {
      animation: none;
    }
  }
  `,
  template: `
    <div id="container">
      @if (!selectedFavorite()) {
        <section class="card glass state">
          <ion-icon name="heart-outline" aria-hidden="true"></ion-icon>
          <h2>No favorite selected</h2>
          <p>Pick a place from your favorites to see it here.</p>
          <ion-button routerLink="/folder/Favorites" routerDirection="root">Go to Favorites</ion-button>
        </section>
      } @else if (coordinates.isLoading()) {
        <section class="card glass state">
          <ion-spinner name="crescent"></ion-spinner>
          <p>Searching location…</p>
        </section>
      } @else if (coordinates.error()) {
        <section class="card glass state">
          <ion-icon name="alert-circle-outline" aria-hidden="true"></ion-icon>
          <h2>Unable to load the location</h2>
          <p>Check your connection and try again.</p>
          <ion-button (click)="coordinates.reload()">Retry</ion-button>
        </section>
      } @else {
        @if (place(); as place) {
          <section class="card glass">
            @if (place.road) {
              <p class="road"><ion-icon name="location-outline" aria-hidden="true"></ion-icon>{{ place.road }}</p>
            }
            <h1>{{ place.city }}</h1>
            @if (place.region) {
              <p class="region">{{ place.region }}</p>
            }
            @if (current(); as current) {
              <div class="current">
                <img class="meteo-icon" [src]="current.icon" [alt]="current.condition"/>
                <span class="temperature">{{ current.temperature }}</span>
              </div>
            }
            <div class="card-info">
              <span class="coords"><ion-icon name="compass-outline" aria-hidden="true"></ion-icon>{{ place.coords }}</span>
              <span class="country"><img [src]="place.flag" alt="">{{ place.country }}</span>
            </div>
          </section>
        } @else {
          <section class="card glass state">
            <ion-icon name="search-outline" aria-hidden="true"></ion-icon>
            <h2>Address not found</h2>
            <p>{{ selectedFavorite()?.address }}, {{ selectedFavorite()?.city }}</p>
          </section>
        }
      }
    </div>
    <footer class="footer" [class.expanded]="footerExpanded()">
      <button
        type="button"
        class="footer-handle"
        [attr.aria-expanded]="footerExpanded()"
        aria-label="Espandi o riduci il footer"
        (click)="footerExpanded.update(expanded => !expanded)"
      ></button>
      <div class="footer-content">
        @if (meteo.isLoading()) {
          <div class="footer-state"><ion-spinner name="crescent"></ion-spinner></div>
        } @else if (meteo.error()) {
          <p class="footer-state">Unable to load the weather.</p>
        } @else {
          <div class="days">
            @for (day of days(); track day.date) {
              <button type="button" class="day" (click)="openHourly(day.date, day.label)">
                <span class="day-label">{{ day.label }}</span>
                <span class="day-temp">{{ day.max }} / {{ day.min }}</span>
                <span class="day-feels">Feels {{ day.feelsMax }} / {{ day.feelsMin }}</span>
                <span><ion-icon name="sunny-outline" aria-label="Sunrise"></ion-icon>{{ day.sunrise }}</span>
                <span><ion-icon name="moon-outline" aria-label="Sunset"></ion-icon>{{ day.sunset }}</span>
              </button>
            }
          </div>
        }
      </div>
    </footer>
  `,
})
export class HomeComponent {
  private storageService = inject(StorageService)
  private apiService = inject(ApiService)
  private modalCtrl = inject(ModalController)
  protected readonly footerExpanded = signal(false);
  protected readonly coordinates = this.apiService.coordinates
  protected readonly meteo = this.apiService.meteo
  private readonly meteoData = computed(() => this.meteo.hasValue() ? this.meteo.value() : null)
  protected selectedFavorite = computed(() => this.storageService.selectedFavorite())
  // dati mostrati in pagina, presi dal primo risultato del geocoding (il più rilevante per Nominatim)
  protected readonly place = computed(() => {
    // in stato di errore value() lancia un'eccezione: hasValue() lo evita
    const result = this.coordinates.hasValue() ? this.coordinates.value()[0] : undefined
    if (!result) return null
    const { address } = result
    const lat = Number(result.lat)
    const lon = Number(result.lon)
    return {
      road: [address.road, address.house_number].filter(Boolean).join(' '),
      city: address.city ?? address.town ?? address.village ?? address.municipality ?? result.name,
      region: address.state,
      country: address.country,
      flag: `/assets/img/flags/${address.country_code}.png`,
      coords: `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`,
    }
  })
  // condizioni dell'ora attuale: la cerchiamo tra gli orari hourly (es. "2026-10-07T14:00"),
  // che sono nel fuso del luogo (timezone=auto) mentre l'ora qui è quella del dispositivo
  protected readonly current = computed(() => {
    const meteo = this.meteoData()
    if (!meteo) return null
    const i = meteo.hourly.time.indexOf(formatDate(new Date(), "yyyy-MM-dd'T'HH:00", 'en-US'))
    if (i < 0) return null
    const condition = getMeteoCondition(meteo, i)
    return {
      condition,
      icon: METEO_ICONS.get(condition),
      temperature: `${Math.round(meteo.hourly.temperature_2m[i])}${meteo.hourly_units.temperature_2m}`,
    }
  })
  // sezioni del footer: prima riga da oggi a 2 giorni fa, seconda riga i prossimi 3 giorni
  // (daily.time è in ordine cronologico, quindi i giorni fino a oggi vanno invertiti)
  protected readonly days = computed(() => {
    const meteo = this.meteoData()
    if (!meteo) return []
    const { daily, daily_units } = meteo
    const temperature = (key: 'temperature_2m_max' | 'temperature_2m_min' | 'apparent_temperature_max' | 'apparent_temperature_min', i: number) =>
      `${Math.round(daily[key][i])}${daily_units[key]}`
    const days = daily.time.map((date, i) => ({
      date,
      label: DAY_LABELS[i],
      max: temperature('temperature_2m_max', i),
      min: temperature('temperature_2m_min', i),
      feelsMax: temperature('apparent_temperature_max', i),
      feelsMin: temperature('apparent_temperature_min', i),
      sunrise: daily.sunrise[i].slice(11),
      sunset: daily.sunset[i].slice(11),
    }))
    return [...days.slice(0, 3).reverse(), ...days.slice(3)]
  })

  constructor(){
    addIcons({
      alertCircleOutline,
      compassOutline,
      heartOutline,
      locationOutline,
      moonOutline,
      searchOutline,
      sunnyOutline
    })

    effect(()=>{
      this.apiService.setCoordinates(this.selectedFavorite())
    })

    // meteo da 2 giorni fa a fra 3 giorni: l'API forecast accetta anche date passate,
    // l'archivio invece arriva con qualche giorno di ritardo e non avrebbe oggi e ieri
    effect(()=>{
      const result = this.coordinates.hasValue() ? this.coordinates.value()[0] : undefined
      this.apiService.setMeteo(result ? { latitude: result.lat, longitude: result.lon, start_date: dayFromToday(-2), end_date: dayFromToday(3) } : null)
    })
  }

  protected async openHourly(date: string, title: string) {
    const modal = await this.modalCtrl.create({
      component: HourlyMeteoModalComponent,
      componentProps: { meteo: this.meteoData(), date, title },
    })
    await modal.present()
  }
}
