import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../config';

// Stvaranje Axios instance s osnovnom konfiguracijom
const apiInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 sekundi timeout
  withCredentials: true, // Omogućuje slanje i primanje kolačića u cross-origin zahtjevima
});

// Interceptor za dodavanje tokena u zaglavlje
apiInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => {
    // Osiguravamo da se uvijek odbacuje objekt Error
    if (error instanceof Error) {
      return Promise.reject(error);
    }
    return Promise.reject(new Error(String(error)));
  }
);

// Response interceptor za rukovanje s 401 greškama
apiInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Posebna obrada za login zahtjeve
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    
    // Ako je greška 401 ali NIJE login zahtjev (dakle izgubljena sesija negdje drugdje)
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(new Error('Session expired. Please login again.'));
    }
    
    // Za sve ostale greške vraćamo originalnu grešku
    return Promise.reject(error);
  }
);

export default apiInstance;
