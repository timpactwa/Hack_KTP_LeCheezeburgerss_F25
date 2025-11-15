import axios from "axios";

import {
  mockAuthResponse,
  mockFetchCrimeHeatmap,
  mockFetchSafeRoute,
  mockPanicResponse,
} from "../mocks/mockData";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === "true";

const client = axios.create({
  baseURL: API_BASE_URL,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("sr_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("sr_token");
      localStorage.removeItem("sr_user");
    }
    return Promise.reject(error);
  }
);

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

// Settings API functions
export async function getTrustedContacts() {
  const { data } = await client.get("/settings/contacts");
  return data;
}

export async function createTrustedContact(payload) {
  const { data } = await client.post("/settings/contacts", payload);
  return data;
}

export async function deleteTrustedContact(contactId) {
  const { data } = await client.delete(`/settings/contacts/${contactId}`);
  return data;
}

export async function updateUserProfile(payload) {
  const { data } = await client.put("/settings/profile", payload);
  return data;
}

export function getApiClient() {
  return client;
}
