import React, { useEffect } from "react";
import { useApi } from "../../hooks/useApi";
import LoadingSpinner from "../../components/LoadingSpinner";

export default function RecommendationsPage() {
  const { data, loading, error, request } = useApi();

  useEffect(() => {
    // In a real app, preferences would be passed here
    request("post", "/recommendations/generate", { targetScore: 80 });
  }, [request]);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-500 text-center">{error}</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Personalized Recommendations</h1>
      <p className="text-gray-600 mb-8">AI-driven matches based on academic excellence and affordability.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {data?.recommendations?.map((rec) => (
          <div key={rec.collegeCode} className="p-6 bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-900">{rec.collegeCode}</h2>
              <span className="bg-green-100 text-green-800 font-bold px-3 py-1 rounded-full text-sm">
                {rec.overallScore}% Match
              </span>
            </div>
            <ul className="mb-4 space-y-2">
              {rec.uiHighlights?.map((highlight, idx) => (
                <li key={idx} className="flex items-center text-sm text-gray-700">
                  <span className="text-green-500 mr-2">✓</span> {highlight}
                </li>
              ))}
            </ul>
            <a href={`/college/${rec.collegeCode}`} className="block text-center w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition">
              Review College
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
