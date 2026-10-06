import { Component, ElementRef, inject, input, model, output } from '@angular/core';
import { ActionSheetController, CheckboxCustomEvent, IonCard, IonCheckbox, IonItem, IonLabel } from '@ionic/angular';
import { StorageService } from '../core/services/storage.service';
import { ICoordinatesParams } from '../models/IQueryParams';

const LONG_PRESS_MS = 500

@Component({
  imports: [IonCard, IonItem, IonLabel, IonCheckbox],
  selector: 'fra-favorite-card',
  styles: `
    ion-card {
      margin: 0;
      border: 1px solid black;
      border-radius: 16px;
      /* evita selezione del testo e menu nativo durante il long press */
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
    }
    ion-item {
      --background: rgb(255, 239, 239);
      --color: black;
    }
    ion-label h2 {
      font-size: 32px;
    }
    ion-label p {
      font-size: 24px;
      font-weight: 500;
      color: black;
    }
    ion-checkbox {
      --size: 32px;
      --checkbox-background-checked: #6815ec;
      --checkmark-color: #2e7d32;
    }
    ion-checkbox::part(container) {
      border-radius: 6px;
      border: 2px solid #6815ec;
      background-color: rgb(255, 239, 239);
    }
  `,
  template: `
    <ion-card
      (pointerdown)="startPress($event)"
      (pointerup)="cancelPress()"
      (pointerleave)="cancelPress()"
      (pointercancel)="cancelPress()"
      (contextmenu)="$event.preventDefault()"
    >
      <ion-item lines="none">
        <ion-label>
          <h2>{{ item().address }}</h2>
          <p>{{ item().city }}</p>
        </ion-label>
        <ion-checkbox slot="end" aria-label="Favorite"
                      [checked]="favorite()"
                      (ionChange)="favoriteToogle($event)"
        ></ion-checkbox>
      </ion-item>
    </ion-card>
  `,
})
export class FavoriteCardComponent {
  private actionSheetCtrl = inject(ActionSheetController)
  private storageService = inject(StorageService)
  public item = input.required<ICoordinatesParams>()
  public favorite = model(false)
  public deleted = output<ICoordinatesParams>()
  private pressTimer?: ReturnType<typeof setTimeout>
  private longPressed = false

  constructor(){
    // il rilascio dopo un long press genera un click che ion-item inoltrerebbe alla checkbox:
    // lo blocchiamo in fase di capture, prima che arrivi all'item
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.addEventListener('click', (event) => {
      if (this.longPressed) {
        event.stopPropagation()
        this.longPressed = false
      }
    }, { capture: true })
  }

  protected favoriteToogle(event: CheckboxCustomEvent){
    this.favorite.set(event.detail.checked)
  }

  protected startPress(event: PointerEvent){
    // solo tasto principale del mouse o tocco
    if (event.button !== 0) return
    this.longPressed = false
    this.cancelPress()
    this.pressTimer = setTimeout(() => {
      this.longPressed = true
      this.confirmDelete()
    }, LONG_PRESS_MS)
  }

  protected cancelPress(){
    clearTimeout(this.pressTimer)
  }

  private async confirmDelete(){
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Remove from favorites?',
      subHeader: `${this.item().address}, ${this.item().city}`,
      buttons: [
        { text: 'Delete', role: 'destructive' },
        { text: 'Cancel', role: 'cancel' },
      ],
    })
    await actionSheet.present()
    const { role } = await actionSheet.onWillDismiss()
    if (role === 'destructive') {
      this.storageService.deleteFromStorage(this.item())
      this.deleted.emit(this.item())
    }
  }
}
