import { computed, inject, Service, signal } from '@angular/core';
import { ISettings } from '../../models/ISettings';
import { AppConfig } from '../../app-config-token';
import { ICoordinatesParams } from '../../models/IQueryParams';

@Service()
export class StorageService {
    private FAVORITE_PREFIX = 'favorite|'
    private SELECTED_KEY = 'selectedFavorite'
    private config: ISettings = inject(AppConfig)
    public favoriteList = signal<ICoordinatesParams[]>([])
    // contiene la chiave di storage del preferito selezionato, non l'oggetto
    public selectedKey = signal<string | null>(localStorage.getItem(this.SELECTED_KEY))
    public selectedFavorite = computed<ICoordinatesParams | null>(() => {
        const storageKey = this.selectedKey()
        if (!storageKey) return null
        try {
            const storageItem: string | null = localStorage.getItem(storageKey)
            return storageItem ? JSON.parse(storageItem) : null
        } catch {
            return null
        }
    })

    public setStorageItem(coordinatesParam: ICoordinatesParams): void{
        const storageKey: string = this.buildStorageKey(coordinatesParam)
        const stringObj: string = JSON.stringify(coordinatesParam)
        localStorage.setItem(storageKey, stringObj)
    }

    public getStorageItem(coordinatesParam: ICoordinatesParams): ICoordinatesParams | null {
        try {
            const storageItem: string | null = localStorage.getItem(this.buildStorageKey(coordinatesParam))
            return storageItem ? JSON.parse(storageItem) : null
        } catch {
            return null
        }
    }

    public checkIfExists(coordinatesParam: ICoordinatesParams): boolean{
        const item = this.getStorageItem(coordinatesParam)
        if(item){
            return true
        } else{
            return false
        }
    }

    public deleteFromStorage(coordinatesParam: ICoordinatesParams): void{
        const storageKey: string = this.buildStorageKey(coordinatesParam)
        localStorage.removeItem(storageKey)
        if (this.selectedKey() === storageKey) {
            this.setSelected(null)
        }
    }

    public setSelected(coordinatesParam: ICoordinatesParams | null): void{
        if (!coordinatesParam) {
            localStorage.removeItem(this.SELECTED_KEY)
            this.selectedKey.set(null)
            return
        }
        const storageKey: string = this.buildStorageKey(coordinatesParam)
        localStorage.setItem(this.SELECTED_KEY, storageKey)
        this.selectedKey.set(storageKey)
    }

    public isSelected(coordinatesParam: ICoordinatesParams): boolean{
        return this.selectedKey() === this.buildStorageKey(coordinatesParam)
    }

    public getFavoriteListFromStorage(): void{
        const items: ICoordinatesParams[] = []
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (!key?.startsWith(this.FAVORITE_PREFIX)) continue
            try {
                items.push(JSON.parse(localStorage.getItem(key)!))
            } catch {
                // valore non valido: lo saltiamo
            }
        }
        this.favoriteList.set(items)
    }

    private buildStorageKey(coordinatesParam: ICoordinatesParams): string{
        const parts: string[] = []
        for (const key of this.config.storageKey) {
            const value: string | undefined = coordinatesParam[key] 
            if(!value?.trim()){
                throw new Error('Impossibile comporre la chiave di storage: verificare che i campi siano tutti popolati')
            }
            parts.push(value.trim())            
        }
        return this.FAVORITE_PREFIX + parts.join('|')
    }

}
