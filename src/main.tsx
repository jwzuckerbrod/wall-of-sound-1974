import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { installProbe } from './ui/probe';
import './styles.css';

installProbe();

// When the code had arrived and started running: the network part of the model's load time (App.tsx, BootDone)
(window as unknown as { __appStart?: number }).__appStart = performance.now();

// Keep the last few runtime errors with full stacks on the window, so a
// headless/automated browser can read them back. Dev only.
if (import.meta.env.DEV) {
  const log: string[] = ((window as unknown as Record<string, unknown>).__errors = []) as string[];
  window.addEventListener('error', (e) => log.push(e.error?.stack ?? String(e.message)));
  window.addEventListener('unhandledrejection', (e) => log.push(String(e.reason?.stack ?? e.reason)));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
