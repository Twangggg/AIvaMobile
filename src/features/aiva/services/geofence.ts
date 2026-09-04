/** Haversine distance in meters. */
export function distanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type GeofenceStatus = {
  insideAny: boolean;
  nearestZoneId: string | null;
  nearestDistanceM: number | null;
  alert: boolean;
};

export function evaluateGeofence(
  point: { latitude: number; longitude: number },
  zones: {
    id: string;
    latitude: number | null;
    longitude: number | null;
    radiusMeters: number;
  }[],
): GeofenceStatus {
  const pinned = zones.filter((z) => z.latitude != null && z.longitude != null);
  if (pinned.length === 0) {
    return { insideAny: true, nearestZoneId: null, nearestDistanceM: null, alert: false };
  }

  let nearestZoneId: string | null = null;
  let nearestDistanceM = Number.POSITIVE_INFINITY;
  let insideAny = false;

  for (const z of pinned) {
    const d = distanceMeters(point, { latitude: z.latitude!, longitude: z.longitude! });
    if (d < nearestDistanceM) {
      nearestDistanceM = d;
      nearestZoneId = z.id;
    }
    if (d <= z.radiusMeters) insideAny = true;
  }

  return {
    insideAny,
    nearestZoneId,
    nearestDistanceM: Number.isFinite(nearestDistanceM) ? nearestDistanceM : null,
    alert: !insideAny,
  };
}
