/**
 * Lightweight geofence checks (no Jest runner required).
 * Run: npx --yes tsx src/features/aiva/services/geofence.selftest.ts
 */
import { distanceMeters, evaluateGeofence } from './geofence';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const home = { latitude: 10.77, longitude: 106.69 };
const near = { latitude: 10.7701, longitude: 106.6901 };
const far = { latitude: 10.9, longitude: 106.9 };

assert(distanceMeters(home, near) < 50, 'near point should be < 50m');
assert(distanceMeters(home, far) > 1000, 'far point should be > 1km');

const inside = evaluateGeofence(near, [
  { id: 'home', latitude: home.latitude, longitude: home.longitude, radiusMeters: 150 },
]);
assert(inside.insideAny && !inside.alert, 'should be inside home zone');

const outside = evaluateGeofence(far, [
  { id: 'home', latitude: home.latitude, longitude: home.longitude, radiusMeters: 150 },
]);
assert(!outside.insideAny && outside.alert, 'should alert outside zone');

console.log('geofence.selftest OK');
