import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const endpoints = {
  // Auth
  login: '/auth/login',
  register: '/auth/register',
  me: '/auth/me',
  verifyEmail: '/auth/verify-email',
  refresh: '/auth/refresh',
  logout: '/auth/logout',
  
  // Users
  profile: '/users/profile',
  updateProfile: '/users/profile',
  changePassword: '/users/password',
  forgotPassword: '/users/forgot-password',
  resetPassword: '/users/reset-password',
  resendVerification: '/users/resend-verification',
  exportData: '/users/export-data',
  deleteAccount: '/users/account',
  
  // Events
  events: '/events',
  eventDetail: (id) => `/events/${id}`,
  myEvents: '/events/my/events',
  createEvent: '/events',
  updateEvent: (id) => `/events/${id}`,
  deleteEvent: (id) => `/events/${id}`,
  updateEventStatus: (id) => `/events/${id}/status`,
  
  // Tickets
  ticketTiers: (eventId) => `/tickets/tiers/event/${eventId}`,
  createTicketTier: '/tickets/tiers',
  updateTicketTier: (id) => `/tickets/tiers/${id}`,
  deleteTicketTier: (id) => `/tickets/tiers/${id}`,
  myTickets: '/tickets/my',
  ticketDetail: (id) => `/tickets/${id}`,
  validateTicket: (id) => `/tickets/${id}/validate`,
  
  // Orders
  createOrder: '/orders',
  myOrders: '/orders/my',
  orderDetail: (id) => `/orders/${id}`,
  cancelOrder: (id) => `/orders/${id}/cancel`,
  stripeWebhook: '/orders/webhook/stripe',
  
  // Admin
  adminStats: '/admin/stats',
  adminRevenue: '/admin/analytics/revenue',
  adminUsers: '/admin/users',
  updateUserRole: (id) => `/admin/users/${id}/role`,
  adminEvents: '/admin/events',
  adminOrders: '/admin/orders',
  clearCache: '/admin/cache/clear',
};

// Helper functions
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
};

export const formatDateTime = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date));
};

export const formatTime = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date));
};

export const getRelativeTime = (date) => {
  const now = new Date();
  const eventDate = new Date(date);
  const diffInMs = eventDate - now;
  const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays < 0) {
    return 'Past event';
  } else if (diffInDays === 0) {
    return 'Today';
  } else if (diffInDays === 1) {
    return 'Tomorrow';
  } else if (diffInDays < 7) {
    return `In ${diffInDays} days`;
  } else if (diffInDays < 30) {
    const weeks = Math.ceil(diffInDays / 7);
    return `In ${weeks} week${weeks > 1 ? 's' : ''}`;
  } else {
    const months = Math.ceil(diffInDays / 30);
    return `In ${months} month${months > 1 ? 's' : ''}`;
  }
};

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePassword = (password) => {
  return password.length >= 6;
};

export const generateOrderNumber = () => {
  return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const generateTicketCode = () => {
  return `TKT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

// Error handling
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    return error.response.data.message || 'An error occurred';
  } else if (error.request) {
    // Request was made but no response received
    return 'Network error. Please check your connection.';
  } else {
    // Something else happened
    return error.message || 'An unexpected error occurred';
  }
};
