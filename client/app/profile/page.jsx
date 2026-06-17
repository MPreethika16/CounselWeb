import React, { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import ProtectedRoute from "../../components/ProtectedRoute";

export default function ProfilePage() {
  const { user } = useContext(AuthContext);

  return (
    <ProtectedRoute>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="mb-4">
            <span className="text-gray-500 text-sm">Email Address</span>
            <p className="text-lg font-medium">{user?.email}</p>
          </div>
          <div className="mb-4">
            <span className="text-gray-500 text-sm">Role</span>
            <p className="text-lg font-medium capitalize">{user?.role}</p>
          </div>
          
          <div className="mt-8 border-t pt-6 space-y-3">
            <a href="/preferences" className="block text-indigo-600 hover:underline">Manage Recommendation Preferences</a>
            <a href="/saved-colleges" className="block text-indigo-600 hover:underline">View Saved Colleges</a>
            <a href="/history" className="block text-indigo-600 hover:underline">View Recommendation History</a>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
