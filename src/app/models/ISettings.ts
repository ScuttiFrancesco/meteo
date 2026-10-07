import { ICoordinatesParams } from "./IQueryParams";

export interface ISettings {
  username: string;
  meteoArchiveUrl: string;
  meteoForecastUrl: string;
  geocodingUrl: string;
  geocodingQueryParams: { 
    inputParams: Record<string, string>;
    staticParams: Record<string, string> 
  };
  meteoQueryParams: {
    inputParams: Record<string, string>;
    staticParams: Record<string, string>
  };
  storageKey: (keyof ICoordinatesParams)[];
}
