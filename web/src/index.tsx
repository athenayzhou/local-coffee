import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import Order from './Order';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <Order />
  </React.StrictMode>
);