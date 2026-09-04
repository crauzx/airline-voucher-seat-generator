export type AircraftType = 'ATR' | 'AIRBUS_320' | 'BOEING_737_MAX';

export const AIRCRAFT_OPTIONS: { label: string; value: AircraftType }[] = [
  { label: 'ATR', value: 'ATR' },
  { label: 'Airbus 320', value: 'AIRBUS_320' },
  { label: 'Boeing 737 Max', value: 'BOEING_737_MAX' },
];

export interface CheckRequest {
  flightNumber: string;
  date: string;
}

export interface CheckResponse {
  exists: boolean;
}

export interface GenerateRequest {
  name: string;
  id: string;
  flightNumber: string;
  date: string;
  aircraft: AircraftType;
}

export interface GenerateResponse {
  success: true;
  seats: string[];
}

export interface ApiErrorShape {
  error: {
    code: string;
    message: string;
  };
}
