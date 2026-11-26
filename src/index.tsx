import { render } from 'solid-js/web';
import './styles/tokens.css';
import './styles/global.css';
import { App } from './App';
import { requestPersistentStorage } from './state/storage';
import { reconnectRememberedHeartRate } from './state/heartRateDevice';
import { simulateHeartRate } from './lib/heartRate';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');

render(() => <App />, root);
requestPersistentStorage();
reconnectRememberedHeartRate();

if (import.meta.env.DEV) {
  // Check heart rate UI without a strap: run `pzt.simulateHeartRate()` in the console.
  Object.assign(window, { pzt: { simulateHeartRate } });
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('Service worker registration failed', error);
    });
  });
}
