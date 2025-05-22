// AxiosInstance.jsx
import axios from 'axios';

const URL = "localhost:3000"; 

const api = axios.create({
  baseURL: `http://${URL}`,
  withCredentials: true, 
  timeout: 30000,
});

export default api;

