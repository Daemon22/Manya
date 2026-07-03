/**
 * Data validation for the Manya Primary Sector tool.
 * Validates GPS coordinates, commodity codes, sensor readings,
 * harvest/production reports, and sector-specific data formats.
 */

/**
 * Validates a GPS coordinate pair.
 * @param {object} coords - The coordinate object.
 * @param {number} coords.latitude - Latitude value (-90 to 90).
 * @param {number} coords.longitude - Longitude value (-180 to 180).
 * @param {object} [options] - Validation options.
 * @param {number} [options.precision=6] - Required decimal precision.
 * @returns {{ valid: boolean, errors: string[], normalized: { latitude: number, longitude: number }|null }}
 */
export function validateCoordinates(coords, options = {}) {
  const errors = [];
  if (!coords || typeof coords !== 'object') {
    return { valid: false, errors: ['Coordinates must be an object with latitude and longitude'], normalized: null };
  }

  const { latitude, longitude } = coords;
  const precision = options.precision || 6;

  if (typeof latitude !== 'number' || isNaN(latitude)) {
    errors.push('Latitude must be a number');
  } else if (latitude < -90 || latitude > 90) {
    errors.push('Latitude must be between -90 and 90');
  }

  if (typeof longitude !== 'number' || isNaN(longitude)) {
    errors.push('Longitude must be a number');
  } else if (longitude < -180 || longitude > 180) {
    errors.push('Longitude must be between -180 and 180');
  }

  if (errors.length > 0) {
    return { valid: false, errors, normalized: null };
  }

  const normalized = {
    latitude: Number(latitude.toFixed(precision)),
    longitude: Number(longitude.toFixed(precision)),
  };

  return { valid: true, errors: [], normalized };
}

/**
 * Validates a commodity against a sector's known commodities.
 * @param {string} sectorId - The sector identifier.
 * @param {string} commodity - The commodity name to validate.
 * @param {object} sectors - The SECTORS configuration object.
 * @returns {{ valid: boolean, sector: string, commodity: string, suggestions: string[] }}
 */
export function validateCommodity(sectorId, commodity, sectors) {
  const sector = sectors[sectorId];
  if (!sector) {
    return { valid: false, sector: sectorId, commodity, suggestions: [] };
  }

  const lowerCommodity = commodity.toLowerCase().trim();
  const match = sector.commodities.find(c => c.toLowerCase() === lowerCommodity);

  if (match) {
    return { valid: true, sector: sectorId, commodity: match, suggestions: [] };
  }

  // Fuzzy match for suggestions
  const suggestions = sector.commodities
    .filter(c => {
      const lower = c.toLowerCase();
      return lower.includes(lowerCommodity) || lowerCommodity.includes(lower);
    })
    .slice(0, 3);

  return { valid: false, sector: sectorId, commodity, suggestions };
}

/**
 * Validates a sensor reading structure.
 * @param {object} reading - The sensor reading.
 * @param {string} reading.type - Sensor type (temperature, humidity, pressure, ph, moisture, radiation).
 * @param {number} reading.value - Sensor value.
 * @param {string} reading.unit - Measurement unit.
 * @param {string} [reading.timestamp] - ISO 8601 timestamp.
 * @param {object} [reading.location] - GPS coordinates.
 * @returns {{ valid: boolean, errors: string[], warnings: string[], reading: object|null }}
 */
export function validateSensorReading(reading) {
  const errors = [];
  const warnings = [];

  if (!reading || typeof reading !== 'object') {
    return { valid: false, errors: ['Reading must be an object'], warnings: [], reading: null };
  }

  const validTypes = ['temperature', 'humidity', 'pressure', 'ph', 'moisture', 'radiation', 'wind-speed', 'rainfall', 'soil-moisture', 'water-level'];
  if (!reading.type || !validTypes.includes(reading.type)) {
    errors.push(`Sensor type must be one of: ${validTypes.join(', ')}`);
  }

  if (typeof reading.value !== 'number' || isNaN(reading.value)) {
    errors.push('Reading value must be a number');
  }

  if (!reading.unit || typeof reading.unit !== 'string') {
    errors.push('Reading unit is required');
  }

  if (!reading.timestamp) {
    warnings.push('No timestamp provided — current time will be used');
  } else if (isNaN(Date.parse(reading.timestamp))) {
    errors.push('Timestamp must be a valid ISO 8601 string');
  }

  // Range validation for known sensor types
  if (reading.type === 'temperature' && typeof reading.value === 'number') {
    if (reading.value < -100 || reading.value > 100) {
      warnings.push(`Temperature ${reading.value}° is outside typical range (-100 to 100)`);
    }
  }

  if (reading.type === 'ph' && typeof reading.value === 'number') {
    if (reading.value < 0 || reading.value > 14) {
      errors.push(`pH value ${reading.value} is outside valid range (0 to 14)`);
    }
  }

  if (reading.type === 'humidity' && typeof reading.value === 'number') {
    if (reading.value < 0 || reading.value > 100) {
      warnings.push(`Humidity ${reading.value}% is outside typical range (0 to 100)`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, warnings, reading: null };
  }

  return {
    valid: true,
    errors: [],
    warnings,
    reading: {
      ...reading,
      timestamp: reading.timestamp || new Date().toISOString(),
    },
  };
}

/**
 * Validates a production/harvest report.
 * @param {object} report - The production report.
 * @param {string} report.sectorId - Sector identifier.
 * @param {string} report.commodity - Commodity name.
 * @param {number} report.quantity - Quantity produced.
 * @param {string} report.unit - Measurement unit.
 * @param {object} [report.location] - GPS coordinates.
 * @param {string} [report.period] - Reporting period.
 * @returns {{ valid: boolean, errors: string[], report: object|null }}
 */
export function validateProductionReport(report) {
  const errors = [];

  if (!report || typeof report !== 'object') {
    return { valid: false, errors: ['Report must be an object'], report: null };
  }

  if (!report.sectorId || typeof report.sectorId !== 'string') {
    errors.push('sectorId is required');
  }

  if (!report.commodity || typeof report.commodity !== 'string') {
    errors.push('commodity is required');
  }

  if (typeof report.quantity !== 'number' || isNaN(report.quantity) || report.quantity < 0) {
    errors.push('quantity must be a non-negative number');
  }

  if (!report.unit || typeof report.unit !== 'string') {
    errors.push('unit is required');
  }

  if (report.location) {
    const coordResult = validateCoordinates(report.location);
    if (!coordResult.valid) {
      errors.push(...coordResult.errors.map(e => `location: ${e}`));
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, report: null };
  }

  return {
    valid: true,
    errors: [],
    report: {
      ...report,
      timestamp: report.timestamp || new Date().toISOString(),
    },
  };
}

/**
 * Validates a unit of measurement against a sector's known units.
 * @param {string} sectorId - The sector identifier.
 * @param {string} unit - The unit to validate.
 * @param {object} sectors - The SECTORS configuration object.
 * @returns {{ valid: boolean, sector: string, unit: string }}
 */
export function validateUnit(sectorId, unit, sectors) {
  const sector = sectors[sectorId];
  if (!sector) {
    return { valid: false, sector: sectorId, unit };
  }

  const lowerUnit = unit.toLowerCase().trim();
  const match = sector.units.find(u => u.toLowerCase() === lowerUnit);

  return { valid: !!match, sector: sectorId, unit: match || unit };
}
