export const MOCK_ROUTE_RESPONSE = {
  start: { lat: 40.73061, lng: -74.0007 },
  end: { lat: 40.7152, lng: -73.983 },
  shortest: {
    distance_m: 3200,
    duration_s: 2400,
    geometry: {
      type: "LineString",
      coordinates: [
        [-74.0007, 40.7306],
        [-73.997, 40.724],
        [-73.989, 40.7187],
        [-73.983, 40.7152],
      ],
    },
  },
  safest: {
    distance_m: 3600,
    duration_s: 2600,
    risk_areas_avoided: 7,
    geometry: {
      type: "LineString",
      coordinates: [
        [-74.0007, 40.7306],
        [-74.002, 40.725],
        [-73.996, 40.7195],
        [-73.989, 40.7172],
        [-73.983, 40.7152],
      ],
    },
  },
};

export const MOCK_HEATMAP = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-73.995, 40.7201] },
      properties: { weight: 0.8 },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-73.989, 40.717] },
      properties: { weight: 0.6 },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-74.001, 40.727] },
      properties: { weight: 0.9 },
    },
  ],
};

export function mockFetchSafeRoute(payload = {}) {
  return Promise.resolve({
    ...MOCK_ROUTE_RESPONSE,
    start: payload.start || MOCK_ROUTE_RESPONSE.start,
    end: payload.end || MOCK_ROUTE_RESPONSE.end,
  });
}

export function mockFetchCrimeHeatmap() {
  return Promise.resolve(MOCK_HEATMAP);
}

export function mockAuthResponse(email) {
  return Promise.resolve({
    token: "demo-token",
    user: { id: 1, email, trusted_contacts: ["+15555555555"] },
  });
}

export function mockPanicResponse(coords) {
  return Promise.resolve({
    status: "sent",
    timestamp: new Date().toISOString(),
    coords,
  });
}
