export interface ICoordinatesParams {
  address: string;
  city: string;
  countryPrefix?: string;
}

export interface IMeteoParams {
  latitude: string;
  longitude: string;
  start_date: string;
  end_date: string;
}