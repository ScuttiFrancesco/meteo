import { Component, computed, effect, inject, input } from '@angular/core';
import { IonButtons, IonContent, IonHeader, IonMenuButton, IonTitle, IonToolbar } from '@ionic/angular';
import { ApiService } from '../core/services/api.service';
import { HomeComponent } from './home.component';
import { FavoritesComponent } from './favorites.component';


@Component({
  selector: 'fra-folder',
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button></ion-menu-button>
        </ion-buttons>
        <ion-title>{{ folder() }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">{{ folder() }}</ion-title>
        </ion-toolbar>
      </ion-header>

      @switch (folder()) {
        @case ('Home') {
          <fra-home/>
        }
        @case ('Favorites') {
          <fra-favorites/>
        }
      }
      
    </ion-content>
`,
  styles: `
  ion-menu-button {
  color: var(--ion-color-primary);
}
ion-content::part(background) {
  background: url('/assets/img/portale.jpg') no-repeat center center / cover;
  opacity: 0.4;
}


  `,
  imports: [IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, HomeComponent, FavoritesComponent],
})
export default class FolderPage {
  readonly folder = input.required<string>();
}
