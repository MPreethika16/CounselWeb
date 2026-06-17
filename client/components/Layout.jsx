import React from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ErrorBoundary from "./ErrorBoundary";

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans">
      <Navbar />
      <ErrorBoundary>
        <main className="flex-grow container mx-auto px-4 py-8">
          {children}
        </main>
      </ErrorBoundary>
      <Footer />
    </div>
  );
};

export default Layout;
