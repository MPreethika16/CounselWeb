import React from 'react';

export default function ErrorFallback({ error, resetErrorBoundary }) {
  const isNetwork = error?.message?.includes('Network Error');
  
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-gray-50 rounded-lg" role="alert">
      <div className="text-red-500 mb-4">
        {isNetwork ? (
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        ) : (
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        )}
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        {isNetwork ? "Connection Lost" : "Something went wrong"}
      </h2>
      <p className="text-gray-600 mb-6 max-w-md">
        {isNetwork 
          ? "We couldn't reach the server. Please check your internet connection."
          : error.message || "An unexpected error occurred. Our team has been notified."}
      </p>
      <button
        onClick={resetErrorBoundary}
        className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition focus:ring-4 focus:ring-indigo-300"
      >
        Try Again
      </button>
    </div>
  );
}
