import { render } from 'solid-js/web';
import './styles/tokens.css';
import './styles/global.css';
import { App } from './App';
import { requestPersistentStorage } from './state/storage';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');

render(() => <App />, root);
requestPersistentStorage();

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('Service worker registration failed', error);
    });
  });
}
