import apiClient from './apiClient';

/**
 * Example frontend service using the Axios client.
 * All functions here simply call the external backend API.
 */

export const login = async (credentials: any) => {
  const response = await apiClient.post('/auth/login', credentials);
  return response.data;
};

export const logout = async () => {
  const response = await apiClient.post('/auth/logout');
  return response.data;
};

export const getUserProfile = async () => {
  const response = await apiClient.get('/users/profile');
  return response.data;
};
