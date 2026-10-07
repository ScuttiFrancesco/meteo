// risposta di Nominatim (format=jsonv2, addressdetails=1): i campi di address
// sono presenti solo se pertinenti al luogo trovato (es. town/village al posto di city)
export interface IGeocodingResponse {
    lat: string;
    lon: string;
    name: string;
    address: {
        house_number?: string;
        road?: string;
        suburb?: string;
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        state?: string;
        postcode?: string;
        country: string;
        country_code: string;
    }
}
