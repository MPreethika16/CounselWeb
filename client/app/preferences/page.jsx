import React, { useEffect, useState } from "react";
import { personalizationService } from "../../services/personalizationService";
import ProtectedRoute from "../../components/ProtectedRoute";
import LoadingSpinner from "../../components/LoadingSpinner";

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const data = await personalizationService.getPreferences();
        setPrefs(data);
      } catch (err) {
        // Handle error
      } finally {
        setLoading(false);
      }
    };
    loadPrefs();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    await personalizationService.updatePreferences(prefs);
    alert("Preferences saved successfully!");
  };

  if (loading) return <LoadingSpinner />;

  return (
    <ProtectedRoute>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Recommendation Preferences</h1>
        <form onSubmit={handleSave} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Budget (₹)</label>
            <input 
              type="number" 
              value={prefs?.budgetRange?.max || 500000} 
              onChange={(e) => setPrefs({...prefs, budgetRange: { ...prefs?.budgetRange, max: Number(e.target.value) }})}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Placement Priority (0-10)</label>
            <input 
              type="range" 
              min="0" max="10" 
              value={prefs?.placementPriority || 5}
              onChange={(e) => setPrefs({...prefs, placementPriority: Number(e.target.value)})}
              className="w-full"
            />
          </div>

          <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700">Save Preferences</button>
        </form>
      </div>
    </ProtectedRoute>
  );
}
