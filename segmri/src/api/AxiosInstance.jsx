// AxiosInstance.jsx
import axios from 'axios';

const URL = "13.229.247.37"; 

const api = axios.create({
  baseURL: `http://${URL}`,
  withCredentials: true, 
  timeout: 30000,
});

export default api;

