import React, { useEffect } from 'react';

const typeStyles = {
  success: 'bg-green-100 text-green-800 border-green-200',
  error: 'bg-red-100 text-red-800 border-red-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200'
};

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (toast.duration) {
      const timer = setTimeout(() => {
        onClose();
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  return (
    <div 
      role="alert" 
      aria-live="assertive"
      className={`min-w-[300px] p-4 rounded-md border shadow-lg flex justify-between items-center transition-all ${typeStyles[toast.type] || typeStyles.info}`}
    >
      <span className="text-sm font-medium">{toast.message}</span>
      <button 
        onClick={onClose} 
        aria-label="Close notification"
        className="ml-4 opacity-70 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}
