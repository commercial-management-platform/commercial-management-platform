/** Mean radius of the Earth used for the Haversine formula, in meters. */
const EARTH_RADIUS_METERS = 6_371_000;

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

/**
 * Great-circle distance between two points on Earth, in meters, rounded to
 * the nearest integer. Used to confirm that the advisor is physically at the
 * client's location when starting a visit.
 */
export function haversineDistanceMeters(a: GeoPoint, b: GeoPoint): number {
  const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

  const deltaLatitude = toRadians(b.latitude - a.latitude);
  const deltaLongitude = toRadians(b.longitude - a.longitude);
  const latitudeA = toRadians(a.latitude);
  const latitudeB = toRadians(b.latitude);

  const sinHalfLat = Math.sin(deltaLatitude / 2);
  const sinHalfLon = Math.sin(deltaLongitude / 2);
  const haversine =
    sinHalfLat * sinHalfLat +
    Math.cos(latitudeA) * Math.cos(latitudeB) * sinHalfLon * sinHalfLon;
  const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return Math.round(EARTH_RADIUS_METERS * centralAngle);
}
