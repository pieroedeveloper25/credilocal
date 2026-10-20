import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './presentacion/web/App';
import './presentacion/web/styles.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
