import React from "react";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-400 py-6 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <p>&copy; {new Date().getFullYear()} CounselWeb. All rights reserved.</p>
        <p className="text-sm mt-2">Data transparency and verified intelligence for higher education.</p>
      </div>
    </footer>
  );
};

export default Footer;
