export interface IGeocodingResponse {
    lat: string;
    lon: string;
    name: string;
    address: {
        road: string;
        suburb: string;
        city: string;
        state: string;
        country: string;
    }
  };
