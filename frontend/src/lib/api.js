import axios from 'axios';
import { supabase } from './supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Attach Supabase JWT to every request automatically
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// ─── Auth ────────────────────────────────────────────────────────
export const authApi = {
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// ─── Listings ────────────────────────────────────────────────────
export const listingsApi = {
  getAll: (params) => api.get('/listings', { params }),
  getMine: () => api.get('/listings/my'),
  getById: (id) => api.get(`/listings/${id}`),
  getCategories: () => api.get('/listings/categories/all'),
  create: (data) => api.post('/listings', data),
  update: (id, data) => api.put(`/listings/${id}`, data),
  delete: (id) => api.delete(`/listings/${id}`),
};

// ─── Profile ─────────────────────────────────────────────────────
export const profileApi = {
  getMyProfile: () => api.get('/profile'),
  updateProfile: (data) => api.put('/profile', data),
  getUserProfile: (id) => api.get(`/profile/${id}`),
};

// ─── Orders ──────────────────────────────────────────────────────
export const ordersApi = {
  getAll: (role) => api.get('/orders', { params: { role } }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  updateStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
};

// ─── Chat ────────────────────────────────────────────────────────
export const chatApi = {
  getConversations: () => api.get('/chat/conversations'),
  getMessages: (orderId) => api.get(`/chat/order/${orderId}`),
  sendMessage: (orderId, content) => api.post(`/chat/order/${orderId}`, { content }),
};

// ─── Wishlist ────────────────────────────────────────────────────
export const wishlistApi = {
  getAll: () => api.get('/wishlist'),
  check: (listingId) => api.get(`/wishlist/check/${listingId}`),
  add: (listingId) => api.post(`/wishlist/${listingId}`),
  remove: (listingId) => api.delete(`/wishlist/${listingId}`),
};

export default api;
