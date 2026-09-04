import { AIRCRAFT_LAYOUTS } from '../../seatGeneration/aircraftLayouts';

describe('AIRCRAFT_LAYOUTS', () => {
  it('defines Airbus 320 and Boeing 737 Max as equal-shaped but distinct objects', () => {
    expect(AIRCRAFT_LAYOUTS.AIRBUS_320).toEqual(AIRCRAFT_LAYOUTS.BOEING_737_MAX);
    expect(AIRCRAFT_LAYOUTS.AIRBUS_320).not.toBe(AIRCRAFT_LAYOUTS.BOEING_737_MAX);
  });

  it('has the expected pool sizes', () => {
    const poolSize = (type: keyof typeof AIRCRAFT_LAYOUTS) =>
      AIRCRAFT_LAYOUTS[type].rows * AIRCRAFT_LAYOUTS[type].letters.length;

    expect(poolSize('ATR')).toBe(72);
    expect(poolSize('AIRBUS_320')).toBe(192);
    expect(poolSize('BOEING_737_MAX')).toBe(192);
  });
});
