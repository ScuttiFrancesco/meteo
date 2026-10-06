import { Component, inject, signal } from '@angular/core';
import { form, FormField, pattern, required } from '@angular/forms/signals';
import { IonButton, IonContent, IonHeader, IonToolbar, IonButtons, IonItem, IonInput, ModalController } from '@ionic/angular';
import { StorageService } from '../core/services/storage.service';
import { ToastService } from '../core/services/toast.service';
import { ICoordinatesParams } from '../models/IQueryParams';

@Component({
  imports: [IonButton, IonContent, IonHeader, IonToolbar, IonButtons, IonItem, IonInput, FormField],
  selector: 'fra-add-favorite-modal',
  styles: `
    ion-content::part(background) {
      background: url('/assets/img/portale.jpg') no-repeat center center / cover;
      opacity: 0.4;
    }

    ion-item {
      --background: rgb(255, 239, 239);
      --color: black;
      --border-radius: 16px;
    }
  `,
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="cancel()">Cancel</ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button (click)="confirm()" [strong]="true">Confirm</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-item>
        <ion-input
            label="Enter your street"
            labelPlacement="stacked"
            placeholder="STREET"
            [formField]="favoriteForm.address"
        ></ion-input>
      </ion-item>
      <ion-item>
        <ion-input
            label="Enter your city"
            labelPlacement="stacked"
            placeholder="CITY"
            [formField]="favoriteForm.city"
        ></ion-input>
      </ion-item>
      <ion-item>
        <ion-input
            label="Enter your country prefix"
            labelPlacement="stacked"
            placeholder="COUNTRY PREFIX"
            [formField]="favoriteForm.countryPrefix"
        ></ion-input>
      </ion-item>
    </ion-content>
  `,
})
export class AddFavoriteModalComponent {
  private modalCtrl = inject(ModalController)
  private storageService = inject(StorageService)
  private toastService = inject(ToastService)
  protected favorite = signal({ address: '', city: '', countryPrefix: '' });
  protected favoriteForm = form(this.favorite, (p) => {
    required(p.address);
    required(p.city)
    // required accetta anche i soli spazi: serve almeno un carattere non vuoto
    pattern(p.address, /\S/);
    pattern(p.city, /\S/)
  });

  cancel() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  confirm() {
    if (this.favoriteForm().invalid()) {
      this.toastService.error('Form fields may be invalid')
      return
    };
    const payload: ICoordinatesParams = {
      address: this.favorite().address.trim(),
      city: this.favorite().city.trim(),
      countryPrefix: this.favorite().countryPrefix.trim()
    }
    const exists = this.storageService.checkIfExists(payload)
    if(exists){
      this.toastService.error('Item already present in the storage')
      return
    }
    this.storageService.setStorageItem(payload)
    this.storageService.getFavoriteListFromStorage()
    this.modalCtrl.dismiss(payload, 'confirm');
  }
}
