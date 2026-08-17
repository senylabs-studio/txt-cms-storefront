import axios from 'axios';
import i18n from './i18n';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('storefront_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Language'] = i18n.language;
  return config;
});

export default apiClient;
