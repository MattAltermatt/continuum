import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { Book } from './data/types';
import { windwardRun } from './data/windward-run';
import { App } from './ui/App';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root not found in index.html');

const mount = (book: Book): void => {
  createRoot(root).render(
    <StrictMode>
      <App book={book} />
    </StrictMode>,
  );
};

// Dev builds open the proving ground on ?book=proving (spec 2026-09-24-proving-ground section 2.2);
// production ignores the parameter and never carries the module.
if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('book') === 'proving') {
  void import('./data/proving-ground').then((m) => mount(m.provingGround));
} else {
  mount(windwardRun);
}
