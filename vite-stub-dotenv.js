// Stub for 'dotenv' module - Node.js-only, not available in browser
// Environment variables are handled by Vite's import.meta.env
export default {
  config: () => {
    console.warn('dotenv.config() called in browser - environment variables should use import.meta.env instead');
    return {};
  }
};

export const config = () => {
  console.warn('dotenv.config() called in browser - environment variables should use import.meta.env instead');
  return {};
};
