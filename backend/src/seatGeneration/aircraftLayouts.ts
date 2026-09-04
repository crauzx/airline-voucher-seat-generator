export type AircraftType = 'ATR' | 'AIRBUS_320' | 'BOEING_737_MAX';

export interface AircraftLayout {
  rows: number;
  letters: string[];
}

export const AIRCRAFT_LAYOUTS: Record<AircraftType, AircraftLayout> = {
  ATR: { rows: 18, letters: ['A', 'C', 'D', 'F'] },
  AIRBUS_320: { rows: 32, letters: ['A', 'B', 'C', 'D', 'E', 'F'] },
  BOEING_737_MAX: { rows: 32, letters: ['A', 'B', 'C', 'D', 'E', 'F'] },
};

export const VALID_AIRCRAFT_TYPES = Object.keys(AIRCRAFT_LAYOUTS) as AircraftType[];

export function isAircraftType(value: string): value is AircraftType {
  return VALID_AIRCRAFT_TYPES.includes(value as AircraftType);
}
