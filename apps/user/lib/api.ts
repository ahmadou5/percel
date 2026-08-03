import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth.store';

const baseURL = process.env.EXPO_PUBLIC_API_URL ?? '';

export const api = axios.create({ baseURL });

let refreshing: Promise<string | null> | null = null;

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().tokens?.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retried?: boolean };
    if (error.response?.data) {
      const serverMsg = (error.response.data as any)?.message ?? (error.response.data as any)?.error;
      if (serverMsg && typeof serverMsg === 'string') {
        error.message = serverMsg;
      }
    } else if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        error.message = 'Connection timed out. Please try again.';
      } else if (error.message?.includes('Network Error') || error.message?.includes('connection') || error.code === 'ERR_NETWORK') {
        error.message = 'Unable to connect to Percel servers. Please check your network and try again.';
      }
    }

    if (error.response?.status !== 401 || original?._retried) {
      return Promise.reject(error);
    }

    original._retried = true;

    if (!refreshing) {
      refreshing = (async () => {
        const auth = useAuthStore.getState();
        const refreshToken = auth.tokens?.refreshToken;
        if (!refreshToken) return null;

        try {
          const { data } = await axios.post(`${baseURL}/api/v1/auth/refresh`, { refreshToken });
          await auth.setTokens(data.data);
          return data.data.accessToken as string;
        } catch (refreshErr) {
          if (axios.isAxiosError(refreshErr) && (refreshErr.response?.status === 401 || refreshErr.response?.status === 403)) {
            await auth.logout();
          }
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
