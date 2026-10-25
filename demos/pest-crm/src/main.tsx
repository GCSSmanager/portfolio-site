import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { installDemoFetch } from '@/demo/install';
import { siteBackHref } from '@/demo/site';
import '@/app/globals.css';

installDemoFetch();
siteBackHref();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
