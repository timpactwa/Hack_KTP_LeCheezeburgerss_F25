import axios from "axios";

import {
  mockAuthResponse,
  mockFetchCrimeHeatmap,
  mockFetchSafeRoute,
  mockPanicResponse,
} from "../mocks/mockData";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== "false";

const client = axios.create({
  baseURL: API_BASE_URL,
});

export async function login(payload) {
  if (USE_MOCK_API) {
    return mockAuthResponse(payload.email);
  }
  const { data } = await client.post("/login", payload);
  return data;
}

export async function register(payload) {
  if (USE_MOCK_API) {
    return mockAuthResponse(payload.email);
  }
  const { data } = await client.post("/register", payload);
  return data;
}

export async function fetchSafeRoute(payload) {
  if (USE_MOCK_API) {
    return mockFetchSafeRoute(payload);
  }
  const { data } = await client.post("/safe-route", payload);
  return data;
}

export async function fetchCrimeHeatmap() {
  if (USE_MOCK_API) {
    return mockFetchCrimeHeatmap();
  }
  const { data } = await client.get("/crime-heatmap");
  return data;
}

export async function sendPanicAlert(payload) {
  if (USE_MOCK_API) {
    return mockPanicResponse(payload);
  }
  const { data } = await client.post("/panic-alert", payload);
  return data;
}
