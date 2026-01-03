// Stub for 'pg' module - Node.js-only, not available in browser
// Database operations should be done through API calls, not directly from client
export const Pool = class {
  constructor() {
    throw new Error('PostgreSQL client (pg) cannot be used in browser. Use API endpoints instead.');
  }
};

export default {
  Pool
};
