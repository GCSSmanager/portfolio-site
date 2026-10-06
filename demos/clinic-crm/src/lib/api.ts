import axios from "axios";
import { clearAuthToken, getAuthToken } from "./auth-token";
import { installDemoApi } from "../demo/install";

export const api = axios.create({
  baseURL: "",
});

installDemoApi(api);

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && !error?.config?.url?.includes("/api/auth/login")) {
      clearAuthToken();
      window.dispatchEvent(new Event("clinic-demo:auth-logout"));
    }
    return Promise.reject(error);
  },
);

export type { Employee, Appointment, Service, Room, Client, ClientGroup, Absence } from "./types";
