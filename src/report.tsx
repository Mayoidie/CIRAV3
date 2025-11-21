import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { ToastProvider } from './components/ui/toast-container';
import { TicketForm } from './components/tickets/TicketForm';

const App: React.FC = () => {
  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  const handleSuccess = () => {
    // After successful submit, navigate back to previous page (or home)
    setTimeout(goBack, 800);
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#F9FAFB] p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Report Issue</h1>
          <button onClick={goBack} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50">← Back</button>
        </div>
        <div className="max-w-3xl">
          <TicketForm onSuccess={handleSuccess} />
        </div>
      </div>
    </ToastProvider>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
