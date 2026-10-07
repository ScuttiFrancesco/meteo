import { Component, computed, inject, signal } from '@angular/core';
import { IonButton, IonCard, IonIcon, IonInput, IonItem, IonLabel } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addCircleOutline, trashOutline } from 'ionicons/icons';
import { StorageService } from '../core/services/storage.service';
import { ToastService } from '../core/services/toast.service';

@Component({
  imports: [IonButton, IonCard, IonIcon, IonInput, IonItem, IonLabel],
  selector: 'fra-notifications',
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 8px;
      gap: 4px
    }

    ion-card {
      margin: 0;
      border: 1px solid black;
      border-radius: 16px;
    }
    ion-item {
      --background: rgb(255, 239, 239);
      --color: black;
    }
    ion-label h2 {
      font-size: clamp(18px, 5.5vw, 28px);
      line-height: 1.2;
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

    .empty {
      text-align: center;
    }
  `,
  template: `
    <ion-card>
      <ion-item lines="none">
        <ion-input
            type="time"
            label="New notification time"
            labelPlacement="stacked"
            [value]="newTime()"
            (ionInput)="newTime.set($event.detail.value ?? '')"
        ></ion-input>
      </ion-item>
    </ion-card>
    <ion-button class="add-btn" (click)="addTime()">
      <ion-icon slot="start" name="add-circle-outline"></ion-icon>
      Add time
    </ion-button>
    @for (time of times(); track time) {
      <ion-card>
        <ion-item lines="none">
          <ion-label><h2>{{ time }}</h2></ion-label>
          <ion-button slot="end" fill="clear" color="danger" [attr.aria-label]="'Delete ' + time" (click)="removeTime(time)">
            <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
          </ion-button>
        </ion-item>
      </ion-card>
    } @empty {
      <p class="empty">No notification times</p>
    }
  `,
})
export class NotificationsComponent {
  private storageService = inject(StorageService)
  private toastService = inject(ToastService)
  protected times = computed(() => this.storageService.notificationTimes())
  // orario scelto nel selettore, nel formato HH:mm
  protected newTime = signal('')

  constructor(){
    addIcons({
      addCircleOutline,
      trashOutline
    })
  }

  protected addTime(){
    const time = this.newTime()
    if (!time) {
      this.toastService.error('Choose a time first')
      return
    }
    if (this.times().includes(time)) {
      this.toastService.error('Time already present')
      return
    }
    this.storageService.setNotificationTimes([...this.times(), time])
    this.newTime.set('')
    this.toastService.success('Notification time added!')
  }

  protected removeTime(time: string){
    this.storageService.setNotificationTimes(this.times().filter(t => t !== time))
  }
}
