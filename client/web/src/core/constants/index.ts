export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const API_ENDPOINTS = {
  auth: '/auth',
  users: '/users',
  schools: '/schools',
  classes: '/classes',
  exams: '/exams',
  questions: '/questions',
  submissions: '/submissions',
  results: '/results',
  appeals: '/appeals',
  omrTemplates: '/omr-templates',
  aiReports: '/ai-reports',
  aiChat: '/ai-chat',
} as const;

export const APP_NAME = 'Smart Grading';
export const APP_VERSION = '1.0.0';

export const STORAGE_KEYS = {
  token: 'access_token',
  refreshToken: 'refresh_token',
  user: 'current_user',
} as const;

export const USER_ROLES = {
  admin: 'admin',
  teacher: 'teacher',
  student: 'student',
  parent: 'parent',
} as const;

export const PAGINATION = {
  defaultPageSize: 20,
} as const;
