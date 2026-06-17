import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="bg-indigo-600 text-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="text-xl font-bold tracking-tight">
          <a href="/">CounselWeb</a>
        </div>
        <div className="flex gap-4">
          <a href="/search" className="hover:text-indigo-200 transition-colors">Search</a>
          <a href="/compare" className="hover:text-indigo-200 transition-colors">Compare</a>
          {user ? (
            <>
              <a href="/recommendations" className="hover:text-indigo-200 transition-colors">Recommendations</a>
              <a href="/profile" className="hover:text-indigo-200 transition-colors">Profile</a>
              <button onClick={logout} className="ml-4 bg-indigo-700 px-3 py-1 rounded hover:bg-indigo-800 transition-colors">Logout</button>
            </>
          ) : (
            <a href="/login" className="ml-4 bg-white text-indigo-600 px-4 py-1 rounded font-medium hover:bg-gray-100 transition-colors">Login</a>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
