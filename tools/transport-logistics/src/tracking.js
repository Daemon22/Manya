/**
 * Shipment tracking with geofencing and ETA estimation for the
 * Manya Transport & Logistics tool.
 */

/**
 * Creates a shipment tracking record.
 * @param {object} input - Shipment input.
 * @param {string} input.trackingNumber - The tracking identifier (AWB, BL, CMR, etc.).
 * @param {string} input.mode - Transport mode (aviation/maritime/road/rail/multimodal).
 * @param {string} input.origin - UN/LOCODE or port/airport code of origin.
 * @param {string} input.destination - UN/LOCODE or port/airport code of destination.
 * @param {object} [input.carrier] - Carrier info { id, name }.
 * @param {string} [input.departureAt] - ISO 8601 planned departure time.
 * @param {string} [input.arrivalAt] - ISO 8601 planned arrival time.
 * @param {string} [input.status] - Initial status (default: 'booked').
 * @returns {{ trackingNumber: string, mode: string, origin: string, destination: string, carrier: object, status: string, events: string[], createdAt: string, updatedAt: string }}
 */
export function createShipment(input) {
  if (!input || !input.trackingNumber || !input.mode || !input.origin || !input.destination) {
    throw new Error('Shipment requires trackingNumber, mode, origin, and destination');
  }
  const now = new Date().toISOString();
  return {
    trackingNumber: input.trackingNumber,
    mode: input.mode,
    origin: input.origin,
    destination: input.destination,
    carrier: input.carrier || {},
    status: input.status || 'booked',
    events: [],
    departureAt: input.departureAt || null,
    arrivalAt: input.arrivalAt || null,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Records a tracking event on a shipment.
 * @param {object} shipment - The shipment returned by createShipment.
 * @param {object} event - The event to record.
 * @param {string} event.type - Event type (departure, arrival, handover, customs, delay, exception).
 * @param {string} event.location - Location code or description.
 * @param {string} [event.timestamp] - ISO 8601 timestamp (defaults to now).
 * @param {object} [event.coordinates] - GPS coordinates { latitude, longitude }.
 * @param {string} [event.note] - Free-form note.
 * @returns {object} The updated shipment.
 */
export function recordEvent(shipment, event) {
  if (!shipment || !event || !event.type) {
    throw new Error('recordEvent requires shipment and event.type');
  }
  const ts = event.timestamp || new Date().toISOString();
  const entry = {
    type: event.type,
    location: event.location || null,
    coordinates: event.coordinates || null,
    note: event.note || null,
    timestamp: ts,
  };
  shipment.events.push(entry);
  // Auto-advance status
  if (event.type === 'departure' && shipment.status === 'booked') shipment.status = 'in-transit';
  else if (event.type === 'arrival' && shipment.status === 'in-transit') shipment.status = 'arrived';
  else if (event.type === 'delivery') shipment.status = 'delivered';
  else if (event.type === 'exception') shipment.status = 'exception';
  shipment.updatedAt = ts;
  return shipment;
}

/**
 * Defines a geofence zone (circular or polygonal).
 * @param {object} input - Geofence definition.
 * @param {string} input.id - Geofence identifier.
 * @param {string} input.name - Human-readable name.
 * @param {string} input.type - Geofence type ('circle' or 'polygon').
 * @param {object} [input.center] - Center for circle { latitude, longitude }.
 * @param {number} [input.radiusMeters] - Radius in meters for circle.
 * @param {Array<{latitude: number, longitude: number}>} [input.polygon] - Polygon vertices.
 * @param {string[]} [input.alertOn] - Events to alert on ('enter', 'exit', 'dwell').
 * @returns {object} The geofence definition.
 */
export function createGeofence(input) {
  if (!input || !input.id || !input.name || !input.type) {
    throw new Error('Geofence requires id, name, and type');
  }
  if (input.type === 'circle' && (!input.center || typeof input.radiusMeters !== 'number')) {
    throw new Error('Circle geofence requires center { latitude, longitude } and radiusMeters');
  }
  if (input.type === 'polygon' && (!Array.isArray(input.polygon) || input.polygon.length < 3)) {
    throw new Error('Polygon geofence requires at least 3 vertices');
  }
  return {
    id: input.id,
    name: input.name,
    type: input.type,
    center: input.center || null,
    radiusMeters: input.radiusMeters || null,
    polygon: input.polygon || null,
    alertOn: input.alertOn || ['enter', 'exit'],
  };
}

/**
 * Checks whether a position is inside a geofence.
 * @param {{ latitude: number, longitude: number }} position - The position to check.
 * @param {object} geofence - The geofence to test against.
 * @returns {{ inside: boolean, geofenceId: string, distance: number|null }}
 */
export function checkGeofence(position, geofence) {
  if (!position || typeof position.latitude !== 'number' || typeof position.longitude !== 'number') {
    throw new Error('Position requires latitude and longitude numbers');
  }
  if (geofence.type === 'circle') {
    const distanceKm = haversineDistance(position, geofence.center);
    const distanceMeters = distanceKm * 1000;
    return { inside: distanceMeters <= geofence.radiusMeters, geofenceId: geofence.id, distance: distanceMeters };
  }
  if (geofence.type === 'polygon') {
    return { inside: pointInPolygon(position, geofence.polygon), geofenceId: geofence.id, distance: null };
  }
  throw new Error(`Unknown geofence type: ${geofence.type}`);
}

/**
 * Estimates arrival time using the great-circle distance and average speed.
 * @param {object} shipment - Shipment with origin and destination coords.
 * @param {object} current - Current position { latitude, longitude, timestamp }.
 * @param {object} destination - Destination coords { latitude, longitude }.
 * @param {object} [options] - Estimation options.
 * @param {number} [options.averageSpeedKmh=60] - Assumed average speed in km/h.
 * @returns {{ estimatedDistanceKm: number, estimatedTimeHours: number, estimatedArrival: string }}
 */
export function estimateETA(shipment, current, destination, options = {}) {
  if (!current || typeof current.latitude !== 'number') {
    throw new Error('Current position requires latitude and longitude');
  }
  if (!destination || typeof destination.latitude !== 'number') {
    throw new Error('Destination requires latitude and longitude');
  }
  const speed = options.averageSpeedKmh !== undefined ? options.averageSpeedKmh : 60;
  if (speed <= 0) throw new Error('averageSpeedKmh must be positive');
  const distanceKm = haversineDistance(current, destination);
  const timeHours = distanceKm / speed;
  const now = current.timestamp ? new Date(current.timestamp) : new Date();
  const arrival = new Date(now.getTime() + timeHours * 3600 * 1000);
  return {
    estimatedDistanceKm: Number(distanceKm.toFixed(2)),
    estimatedTimeHours: Number(timeHours.toFixed(2)),
    estimatedArrival: arrival.toISOString(),
  };
}

// -- Internal helpers --

/**
 * Great-circle distance in km using the haversine formula.
 */
function haversineDistance(a, b) {
  const R = 6371; // km
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Ray-casting point-in-polygon test.
 */
function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].latitude, yi = polygon[i].longitude;
    const xj = polygon[j].latitude, yj = polygon[j].longitude;
    const intersect = (yi > point.longitude) !== (yj > point.longitude)
      && point.latitude < ((xj - xi) * (point.longitude - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
