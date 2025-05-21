// AxiosInstance.jsx
import axios from 'axios';

const URL = "ec2-3-1-211-235.ap-southeast-1.compute.amazonaws.com"; 

const api = axios.create({
  baseURL: `http://${URL}`,
  withCredentials: true,  // This is important for cookies
  timeout: 30000,
});

export default api;