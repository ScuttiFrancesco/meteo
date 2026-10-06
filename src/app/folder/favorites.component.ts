import { Component, computed, inject } from '@angular/core';
import { FavoriteCardComponent } from '../shared/favorite-card.component';
import { IonButton, IonIcon, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addCircleOutline } from 'ionicons/icons';
import { AddFavoriteModalComponent } from './add-favorite-modal.component';
import { ICoordinatesParams } from '../models/IQueryParams';
import { StorageService } from '../core/services/storage.service';
import { ToastService } from '../core/services/toast.service';

@Component({
  imports: [FavoriteCardComponent, IonButton, IonIcon],
  selector: 'fra-favorites',
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 8px;
      gap: 4px
    }

    .add-btn {
      /* dimensioni */
      height: 52px;
      width: 50%;
      align-self: center;
      font-size: 1.1rem;

      --padding-start: 20px;
      --padding-end: 20px;
      --border-radius: 12px;

      /* colori */
      --background: #2e7d32;
      --background-hover: #388e3c;
      --background-activated: #1b5e20;
      --color: #ffffff;
      --box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    }

    .add-btn ion-icon {
      font-size: 28px;
      color: #ffeb3b;
      margin-inline-end: 8px;
    }
  `,
  template: `
    <ion-button class="add-btn" (click)="openAddFavorite()">
      <ion-icon slot="start" name="add-circle-outline"></ion-icon>
      Add new Favorite
    </ion-button>
    @for (fav of favorites(); track fav) {
      <fra-favorite-card [item]="fav" (deleted)="removeFavorite($event)"/>
    }
  `,
})
export class FavoritesComponent {
  private modalCtrl = inject(ModalController)
  private storageService = inject(StorageService)
  private toastService = inject(ToastService)
  protected favorites = computed(()=> this.storageService.favoriteList())

  constructor(){
    addIcons({
      addCircleOutline
    })
    this.storageService.getFavoriteListFromStorage()
  }

  async openAddFavorite() {
    const modal = await this.modalCtrl.create({ component: AddFavoriteModalComponent })
    await modal.present()
    const { role } = await modal.onWillDismiss<ICoordinatesParams>()
    if (role === 'confirm') {
      this.toastService.success('Favorite added successfully!')
    }
  }

  protected removeFavorite(item: ICoordinatesParams) {
    this.storageService.deleteFromStorage(item)
    this.storageService.getFavoriteListFromStorage()
  }
}
