import { randomInt } from 'crypto';
import { AIRCRAFT_LAYOUTS, AircraftType } from './aircraftLayouts';

export function generateSeats(aircraftType: AircraftType): [string, string, string] {
  // hasOwnProperty guard: a bare index lookup resolves inherited keys such as
  // "constructor" to a truthy value and would skip the unknown-type error below.
  const layout = Object.prototype.hasOwnProperty.call(AIRCRAFT_LAYOUTS, aircraftType)
    ? AIRCRAFT_LAYOUTS[aircraftType]
    : undefined;
  if (!layout) {
    throw new Error(`Unknown aircraft type: ${aircraftType}`);
  }

  const pool: string[] = [];
  for (let row = 1; row <= layout.rows; row++) {
    for (const letter of layout.letters) {
      pool.push(`${row}${letter}`);
    }
  }

  if (pool.length < 3) {
    throw new Error(`Aircraft type ${aircraftType} does not have enough seats to generate vouchers`);
  }

  // Partial Fisher-Yates: j is drawn from [i, pool.length - 1], so the first three
  // slots are a uniform sample. These are prizes, so the draw uses a CSPRNG.
  for (let i = 0; i < 3; i++) {
    const j = i + randomInt(pool.length - i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return [pool[0], pool[1], pool[2]];
}
