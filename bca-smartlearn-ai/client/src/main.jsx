import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { TooltipProvider } from './components/ui/tooltip';
import { queryClient } from './lib/queryClient';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={220} skipDelayDuration={400}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <Toaster
          position="top-right"
          closeButton
          richColors
          toastOptions={{
            style: {
              borderRadius: '0.9rem',
              border: '1px solid #ece7e0',
              fontSize: '13px',
            },
          }}
        />
      </TooltipProvider>
    </QueryClientProvider>
  </StrictMode>
);
