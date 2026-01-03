
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

console.log('🚀 StoryArt: Starting application initialization...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ StoryArt: Root element not found!');
  throw new Error("Could not find root element to mount to");
}

console.log('✅ StoryArt: Root element found, creating React root...');

const root = ReactDOM.createRoot(rootElement);
console.log('✅ StoryArt: React root created, rendering app...');

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

console.log('✅ StoryArt: App rendered successfully');
