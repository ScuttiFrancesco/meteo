import { Component, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonTitle, IonToolbar, ModalController } from '@ionic/angular';
import { IMeteoResponse } from '../models/IMeteoResponse';
import { getMeteoCondition, METEO_ICONS } from '../shared/meteo-icons';

@Component({
  imports: [DatePipe, IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonTitle, IonToolbar],
  selector: 'fra-hourly-meteo-modal',
  styles: `
    ion-content::part(background) {
      background: url('/assets/img/portale.jpg') no-repeat center center / cover;
      opacity: 0.4;
    }

    ion-item {
      --background: rgb(255, 239, 239);
      --color: black;
      --border-radius: 16px;
      margin-bottom: 8px;
    }

    img {
      width: 48px;
    }
  `,
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ title() }} · {{ date() | date: 'd MMM' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close()">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      @for (hour of hours(); track hour.time) {
        <ion-item lines="none">
          <img slot="start" [src]="hour.icon" [alt]="hour.condition"/>
          <ion-label>
            <h2>{{ hour.time }} · {{ hour.temperature }}</h2>
            <p>Feels like {{ hour.apparentTemperature }} · Humidity {{ hour.humidity }} · Clouds {{ hour.cloudcover }}</p>
            <p>Precipitation {{ hour.precipitation }} · Rain {{ hour.rain }} · Snow {{ hour.snowfall }}</p>
            <p>Wind {{ hour.windspeed }} · Gusts {{ hour.windgusts }} · Direction {{ hour.winddirection }}</p>
          </ion-label>
        </ion-item>
      }
    </ion-content>
  `,
})
export class HourlyMeteoModalComponent {
  private modalCtrl = inject(ModalController)
  readonly meteo = input.required<IMeteoResponse>()
  // giorno da mostrare, in formato yyyy-MM-dd come daily.time
  readonly date = input.required<string>()
  readonly title = input.required<string>()

  // tutte le ore del giorno selezionato
  protected readonly hours = computed(() => {
    const meteo = this.meteo()
    const { hourly, hourly_units } = meteo
    return hourly.time.flatMap((time, i) => {
      if (!time.startsWith(this.date())) return []
      // valore dell'ora i con la sua unità di misura (hourly e hourly_units hanno le stesse chiavi)
      const value = (key: keyof typeof hourly_units) => `${hourly[key][i]}${hourly_units[key]}`
      const condition = getMeteoCondition(meteo, i)
      return [{
        time: time.slice(11),
        condition,
        icon: METEO_ICONS.get(condition),
        temperature: value('temperature_2m'),
        apparentTemperature: value('apparent_temperature'),
        humidity: value('relativehumidity_2m'),
        cloudcover: value('cloudcover'),
        precipitation: value('precipitation'),
        rain: value('rain'),
        snowfall: value('snowfall'),
        windspeed: value('windspeed_10m'),
        windgusts: value('windgusts_10m'),
        winddirection: value('winddirection_10m'),
      }]
    })
  })

  close() {
    this.modalCtrl.dismiss();
  }
}
