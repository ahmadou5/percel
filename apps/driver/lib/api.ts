import axios, { type AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';

import { useDriverStore } from '@/store/driver.store';

const DEFAULT_API_URL = 'https://percel-production.up.railway.app';
const configuredBaseURL = process.env.EXPO_PUBLIC_API_URL?.trim();
export const baseURL = configuredBaseURL && /^https?:\/\//.test(configuredBaseURL) ? configuredBaseURL : DEFAULT_API_URL;

export const api = axios.create({ baseURL, timeout: 15000 });

let refreshing: Promise<string | null> | null = null;

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useDriverStore.getState().tokens?.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retried?: boolean };

    if (!error.response && error.message === 'Network Error') {
      const detail = __DEV__ ? ` API: ${baseURL}` : ' Please check your connection.';
      error.message = `Could not reach Percel server.${detail}`;
    }

    if (error.response?.data) {
      const serverMsg = (error.response.data as any)?.message ?? (error.response.data as any)?.error;
      if (serverMsg && typeof serverMsg === 'string') {
        error.message = serverMsg;
      }
    }

    if (error.response?.status !== 401 || original?._retried) {
      return Promise.reject(error);
    }

    original._retried = true;

    if (!refreshing) {
      refreshing = (async () => {
        const auth = useDriverStore.getState();
        const refreshToken = auth.tokens?.refreshToken;
        if (!refreshToken) return null;

        try {
          const { data } = await axios.post(`${baseURL}/api/v1/auth/refresh`, { refreshToken });
          await auth.setTokens(data.data);
          return data.data.accessToken as string;
        } catch {
          await auth.logout();
          return null;
        } finally {
          refreshing = null;
        }
      })();
    }

    const nextToken = await refreshing;
    if (!nextToken) return Promise.reject(error);

    original.headers = { ...(original.headers ?? {}), Authorization: `Bearer ${nextToken}` };
    return api.request(original);
  },
);

export const http = {
  get: <T>(url: string, config?: AxiosRequestConfig) => api.get<T>(url, config),
  post: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => api.post<T>(url, body, config),
  put: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => api.put<T>(url, body, config),
  patch: <T>(url: string, body?: unknown, config?: AxiosRequestConfig) => api.patch<T>(url, body, config),
  delete: <T>(url: string, config?: AxiosRequestConfig) => api.delete<T>(url, config),
};
