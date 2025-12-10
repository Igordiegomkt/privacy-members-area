import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { PurchaseProvider } from './contexts/PurchaseContext';
import { CheckoutProvider } from './contexts/CheckoutContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <PurchaseProvider>
        <CheckoutProvider>
          <App />
        </CheckoutProvider>
      </PurchaseProvider>
    </BrowserRouter>
  </React.StrictMode>
);