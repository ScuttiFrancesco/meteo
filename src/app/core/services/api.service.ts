import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import { ISettings } from '../../models/ISettings';
import { AppConfig } from '../../app-config-token';
import { IGeocodingResponse } from '../../models/IGeocodingResponse';
import { ICoordinatesParams, IMeteoParams } from '../../models/IQueryParams';
import { IMeteoResponse } from '../../models/IMeteoResponse';

@Service()
export class ApiService {

    private readonly http = inject(HttpClient);
    private readonly config: ISettings = inject(AppConfig);
    private readonly coordinatesParam = signal<ICoordinatesParams | null>(null);
    private readonly meteoForecastParam = signal<IMeteoParams | null>(null);
    private readonly meteoArchiveParam = signal<IMeteoParams | null>(null);

    public readonly coordinates = httpResource<IGeocodingResponse[]>(() => {
        const queryParam = this.coordinatesParam();
        return queryParam ? { url: this.config.geocodingUrl, params: this.buildParamsCoordinates(queryParam) } : undefined;
        }, { defaultValue: [] });
    
    public readonly meteo = httpResource<IMeteoResponse | null>(() => {
        const queryParam = this.meteoForecastParam();
        return queryParam ? { url: this.config.meteoForecastUrl, params: this.buildParamsMeteo(queryParam) } : undefined;
        }, { defaultValue: null });

    public readonly meteoArchive = httpResource<IMeteoResponse | null>(() => {
        const queryParam = this.meteoArchiveParam();
        return queryParam ? { url: this.config.meteoArchiveUrl, params: this.buildParamsMeteo(queryParam) } : undefined;
        }, { defaultValue: null });

    public setCoordinates(params: ICoordinatesParams): void {
        this.coordinatesParam.set(params);
    }

    public setMeteo(params: IMeteoParams): void {
        this.meteoForecastParam.set(params);
    }

    public setMeteoArchive(params: IMeteoParams): void {
        this.meteoArchiveParam.set(params);
    }

    private buildParamsCoordinates(coordinatesParams: ICoordinatesParams): Record<string, string> {
        const { address, city, countryPrefix } = coordinatesParams;
        const inputs: Record<string, string> = { address, city, countryPrefix: countryPrefix ?? 'it' };
        const params: Record<string, string> = {};
        for (const [key, paramName] of Object.entries(this.config.geocodingQueryParams.inputParams)) {
            params[paramName] = inputs[key];
        }
        for (const [key, value] of Object.entries(this.config.geocodingQueryParams.staticParams)) {
            params[key] = value;
        }
        return params;
    }

    private buildParamsMeteo(meteoParams: IMeteoParams): Record<string, string> {
        const { latitude, longitude, start_date, end_date } = meteoParams;
        const inputs: Record<string, string> = { latitude: latitude, longitude: longitude, start_date, end_date };
        const params: Record<string, string> = {};
        for (const [key, paramName] of Object.entries(this.config.meteoQueryParams.inputParams)) {
            params[paramName] = inputs[key];
        }
        for (const [key, value] of Object.entries(this.config.meteoQueryParams.staticParams)) {
            params[key] = value;
        }
        return params;
    }
}
