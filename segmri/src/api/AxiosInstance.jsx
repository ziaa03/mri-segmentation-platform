// AxiosInstance.jsx
import axios from 'axios';
// import { message } from 'antd'; // Uncomment if needed later

const URL = "localhost:3000"; 

const api = axios.create({
  baseURL: `http://${URL}`, 
  headers: {
    'Content-Type': 'application/json',
    // 'Cache-Control': 'no-cache, no-store, must-revalidate',
    // 'Pragma': 'no-cache',
    // 'Expires': '0'
  },
  withCredentials: true,
  timeout: 5000,
});

// const clearAuthState = () => {
//   localStorage.removeItem('authState');
//   localStorage.removeItem('pfpLastFetch');
// };

// const publicEndpoints = [
//   '/login',
//   '/register',
//   '/fetch/fetch_announcements',
//   '/fetch/fetch_profile_data',
//   '/fetch/announcement_pictures',
//   '/logout'
// ];

// api.interceptors.request.use(
//   (config) => {
//     const isPublicEndpoint = publicEndpoints.some(endpoint =>
//       config.url && config.url.includes(endpoint)
//     );

//     if (isPublicEndpoint) {
//       return config;
//     }

//     const authState = localStorage.getItem('authState');
//     if (!authState) {
//       return Promise.reject({
//         response: {
//           status: 401,
//           data: { message: 'Authentication required' }
//         }
//       });
//     }

//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

export default api;