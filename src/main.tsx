import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { PurchaseProvider } from './contexts/PurchaseContext';
import { CheckoutProvider } from './contexts/CheckoutContext';
import { AuthProvider } from './contexts/AuthContext'; // Novo import

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PurchaseProvider>
          <CheckoutProvider>
            <App />
          </CheckoutProvider>
        </PurchaseProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);