import React, { useState, useEffect } from "react";
import { useApi } from "../../hooks/useApi";
import LoadingSpinner from "../../components/LoadingSpinner";

export default function SearchPage() {
  const { data, loading, request } = useApi();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (query.length > 2) {
      const delay = setTimeout(() => {
        request("get", "/search", null, { q: query });
      }, 300);
      return () => clearTimeout(delay);
    }
  }, [query, request]);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Search Colleges</h1>
      <input 
        type="text" 
        value={query} 
        onChange={(e) => setQuery(e.target.value)} 
        placeholder="Search by name, city, course..." 
        className="w-full p-4 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 text-lg"
      />

      {loading && <LoadingSpinner />}

      <div className="mt-8 flex flex-col gap-4">
        {data?.results?.map((college) => (
          <div key={college._id} className="p-6 bg-white rounded-lg shadow border border-gray-100 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-indigo-700">{college.collegeName}</h2>
              <p className="text-gray-600">{college.city}, {college.state}</p>
            </div>
            <a href={`/college/${college.collegeCode}`} className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded hover:bg-indigo-100">View Details</a>
          </div>
        ))}
        {data?.results?.length === 0 && !loading && (
          <p className="text-center text-gray-500">No colleges found matching "{query}".</p>
        )}
      </div>
    </div>
  );
}
