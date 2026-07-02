const env = {
  apiUrl: import.meta.env.VITE_API_URL || '/api/v1',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://159.223.169.35:3000',
  appName: import.meta.env.VITE_APP_NAME || 'Smart Grading',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  enableDebug: import.meta.env.DEV,
} as const;

export type Env = typeof env;
export default env;
