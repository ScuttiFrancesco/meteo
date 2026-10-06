import { inject, Service } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircleOutline, checkmarkCircleOutline } from 'ionicons/icons';

const TOAST_DURATION_MS = 3000

@Service()
export class ToastService {
    private toastCtrl = inject(ToastController)
    private currentToast?: HTMLIonToastElement

    constructor(){
        addIcons({
            alertCircleOutline,
            checkmarkCircleOutline
        })
    }

    public success(message: string): Promise<void>{
        return this.show(message, 'success', 'checkmark-circle-outline')
    }

    public error(message: string): Promise<void>{
        return this.show(message, 'danger', 'alert-circle-outline')
    }

    private async show(message: string, color: string, icon: string): Promise<void>{
        // un solo toast alla volta: se ne arriva uno nuovo, il precedente viene chiuso
        await this.currentToast?.dismiss()
        this.currentToast = await this.toastCtrl.create({
            message,
            color,
            icon,
            duration: TOAST_DURATION_MS,
            position: 'bottom',
            swipeGesture: 'vertical',
            cssClass: 'fra-toast',
        })
        await this.currentToast.present()
    }
}
