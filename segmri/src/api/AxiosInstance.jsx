import axios from 'axios';

const URL = "http://localhost:3000"; 

const api = axios.create({
  baseURL: URL,
  // baseURL: 'https://cos30045.xyz',
  withCredentials: true, 
  timeout: 30000,
});

export default api;