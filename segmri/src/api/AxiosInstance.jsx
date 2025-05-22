// AxiosInstance.jsx
import axios from 'axios';

// const URL = "localhost:8000"; 

const api = axios.create({
  // baseURL: http://${URL},
  baseURL: 'https://cos30045.xyz',
  withCredentials: true, 
  timeout: 30000,
});

export default api;