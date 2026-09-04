import { generateSeats } from '../../seatGeneration/generateSeats';
import { AIRCRAFT_LAYOUTS, AircraftType } from '../../seatGeneration/aircraftLayouts';

describe('generateSeats', () => {
  const aircraftTypes: AircraftType[] = ['ATR', 'AIRBUS_320', 'BOEING_737_MAX'];

  it.each(aircraftTypes)('returns 3 unique seats for %s', (aircraftType) => {
    for (let i = 0; i < 500; i++) {
      const seats = generateSeats(aircraftType);
      expect(seats).toHaveLength(3);
      expect(new Set(seats).size).toBe(3);
    }
  });

  it.each(aircraftTypes)('every seat is within the valid row/letter set for %s', (aircraftType) => {
    const layout = AIRCRAFT_LAYOUTS[aircraftType];
    const seatPattern = /^(\d+)([A-Z])$/;

    for (let i = 0; i < 500; i++) {
      const seats = generateSeats(aircraftType);
      for (const seat of seats) {
        const match = seatPattern.exec(seat);
        expect(match).not.toBeNull();
        const row = Number(match![1]);
        const letter = match![2];
        expect(row).toBeGreaterThanOrEqual(1);
        expect(row).toBeLessThanOrEqual(layout.rows);
        expect(layout.letters).toContain(letter);
      }
    }
  });

  it('never produces seat letters B or E for ATR', () => {
    for (let i = 0; i < 500; i++) {
      const seats = generateSeats('ATR');
      for (const seat of seats) {
        expect(seat.endsWith('B')).toBe(false);
        expect(seat.endsWith('E')).toBe(false);
      }
    }
  });

  it('throws for an unknown aircraft type', () => {
    expect(() => generateSeats('CONCORDE' as AircraftType)).toThrow('Unknown aircraft type');
  });

  it('draws from crypto.randomInt rather than Math.random', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = require('crypto') as typeof import('crypto');
    const randomIntSpy = jest.spyOn(crypto, 'randomInt');
    const mathRandomSpy = jest.spyOn(Math, 'random');

    generateSeats('AIRBUS_320');

    expect(randomIntSpy).toHaveBeenCalled();
    expect(mathRandomSpy).not.toHaveBeenCalled();

    randomIntSpy.mockRestore();
    mathRandomSpy.mockRestore();
  });

  it('throws for a key inherited from Object.prototype', () => {
    expect(() => generateSeats('constructor' as AircraftType)).toThrow('Unknown aircraft type');
  });
});
