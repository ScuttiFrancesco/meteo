import { effect, inject, Service } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { BackgroundRunner } from '@capacitor/background-runner';
import { ApiService } from './api.service';
import { StorageService } from './storage.service';

// deve coincidere con plugins.BackgroundRunner.label in capacitor.config.ts
const RUNNER_LABEL = 'it.fra.meteoalert.check'

// passa al runner (src/runners/runner.js) la località del preferito selezionato e gli orari
// delle notifiche scelti nella pagina Notifications: è il runner, anche ad app chiusa,
// a scaricare il meteo e programmarle
@Service()
export class NotificationService {
    private apiService = inject(ApiService)
    private storageService = inject(StorageService)

    constructor() {
        // il runner esiste solo nell'app nativa: nel browser (ng serve) non facciamo nulla
        if (!Capacitor.isNativePlatform()) return

        // le coordinate arrivano dal geocoding del preferito selezionato, avviato dalla home
        effect(() => {
            const favorite = this.storageService.selectedFavorite()
            const place = this.apiService.coordinates.hasValue() ? this.apiService.coordinates.value()[0] : undefined
            if (!favorite) {
                this.dispatch('clearSettings', {})
            } else if (place) {
                const { address } = place
                this.dispatch('saveSettings', {
                    name: address.city ?? address.town ?? address.village ?? address.municipality ?? place.name,
                    latitude: place.lat,
                    longitude: place.lon,
                    times: this.storageService.notificationTimes(),
                })
            }
        })
    }

    private async dispatch(event: string, details: Record<string, unknown>): Promise<void> {
        try {
            // da Android 13 serve il permesso: il popup compare solo la prima volta
            if (event === 'saveSettings') {
                await BackgroundRunner.requestPermissions({ apis: ['notifications'] })
            }
            await BackgroundRunner.dispatchEvent({ label: RUNNER_LABEL, event, details })
        } catch (err) {
            console.error(`Errore nell'evento ${event} del runner`, err)
        }
    }
}
