import { haversineDistanceMeters } from './geo.js';

describe('haversineDistanceMeters', () => {
  it('is 0 for the same point', () => {
    const point = { latitude: 4.711, longitude: -74.0721 };

    expect(haversineDistanceMeters(point, point)).toBe(0);
  });

  it('matches the well-known ~111.2 km per degree of longitude at the equator', () => {
    const distance = haversineDistanceMeters(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 },
    );

    expect(distance).toBe(111_195);
  });

  it('rounds to the exact check-in radius (15 m) at its boundary', () => {
    // 15 m north of a fixed client location, using the meters-per-degree of
    // latitude constant (pi/180 * Earth radius).
    const client = { latitude: 4.711, longitude: -74.0721 };
    const metersPerDegreeLatitude = (Math.PI / 180) * 6_371_000;
    const fifteenMetersNorth = {
      latitude: client.latitude + 15 / metersPerDegreeLatitude,
      longitude: client.longitude,
    };

    expect(haversineDistanceMeters(client, fifteenMetersNorth)).toBe(15);
  });
});
