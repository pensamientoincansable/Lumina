import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

declare global {
  interface Window {
    /** Defined by the boot guard inline script in index.html. */
    __luminaBootFail?: (title: string, lines?: string[]) => void;
  }
}

/**
 * Resolves the mount point defensively.
 *
 * `throw`ing here was the single most likely way to end up with a permanently
 * blank page: the exception never reaches React, so the user just sees white.
 * Creating the node (and reporting through the boot guard) is strictly better.
 */
function getMountPoint(): HTMLElement {
  let element = document.getElementById('root');
  if (!element) {
    console.warn('[Lumina] #root not found in the document — creating it.');
    element = document.createElement('div');
    element.id = 'root';
    document.body.appendChild(element);
  }
  return element;
}

function dismissBootScreen() {
  document.getElementById('boot')?.remove();
}

const root = ReactDOM.createRoot(getMountPoint());

try {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
  // React removes the splash as soon as the tree is in the DOM (also handled in CSS).
  dismissBootScreen();
} catch (error) {
  // Surface it instead of leaving a blank page.
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error('[Lumina] fatal error while mounting:', error);
  window.__luminaBootFail?.('The app crashed while starting', [message]);
}
