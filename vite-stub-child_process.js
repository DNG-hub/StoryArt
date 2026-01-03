// Stub for 'child_process' module - Node.js-only, not available in browser
// Process execution should be done through API endpoints, not directly from client
export const execSync = () => {
  throw new Error('child_process.execSync cannot be used in browser. Use API endpoints instead.');
};

export const exec = () => {
  throw new Error('child_process.exec cannot be used in browser. Use API endpoints instead.');
};

export const spawn = () => {
  throw new Error('child_process.spawn cannot be used in browser. Use API endpoints instead.');
};

export default {
  execSync,
  exec,
  spawn
};
