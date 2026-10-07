export interface IMeteoResponse {
  latitude: number;
  longitude: number;
  hourly_units: {
    temperature_2m: string;
    relativehumidity_2m: string;
    apparent_temperature: string;
    precipitation: string;
    rain: string;
    snowfall: string;
    cloudcover: string;
    windspeed_10m: string;
    windgusts_10m: string;
    winddirection_10m: string;
  };
    hourly: {
        time: string[];
        temperature_2m: number[];
        relativehumidity_2m: number[];
        apparent_temperature: number[];
        precipitation: number[];
        rain: number[];
        snowfall: number[];
        cloudcover: number[];
        windspeed_10m: number[];
        windgusts_10m: number[];
        winddirection_10m: number[];
    };
    daily_units: {
        temperature_2m_max: string;
        temperature_2m_min: string;
        apparent_temperature_max: string;
        apparent_temperature_min: string;
        sunrise: string;
        sunset: string;
        windspeed_10m_max: string;
        winddirection_10m_dominant: string;
    };
    daily: {
        time: string[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        apparent_temperature_max: number[];
        apparent_temperature_min: number[];
        sunrise: string[];
        sunset: string[];
        windspeed_10m_max: number[];
        winddirection_10m_dominant: number[];
    };
}