import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import { ISettings } from '../../models/ISettings';
import { AppConfig } from '../../app-config-token';
import { IGeocodingResponse } from '../../models/IGeocodingResponse';
import { ICoordinatesParams } from '../../models/IQueryParams';

@Service()
export class ApiService {

    private readonly http = inject(HttpClient);
    private readonly config: ISettings = inject(AppConfig);
    private readonly coordinatesParam = signal<ICoordinatesParams | null>(null);

    public readonly coordinates = httpResource<IGeocodingResponse[]>(() => {
        const queryParam = this.coordinatesParam();
        return queryParam ? { url: this.config.geocodingUrl, params: this.buildParamsCoordinates(queryParam) } : undefined;
        }, { defaultValue: [] });

    public setCoordinates(params: ICoordinatesParams): void {
        this.coordinatesParam.set(params);
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
}
