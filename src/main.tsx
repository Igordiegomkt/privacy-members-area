import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { PurchaseProvider } from './contexts/PurchaseContext.tsx';
import { CheckoutProvider } from './contexts/CheckoutContext.tsx';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PurchaseProvider>
      <CheckoutProvider>
        <App />
      </CheckoutProvider>
    </PurchaseProvider>
  </React.StrictMode>,
)