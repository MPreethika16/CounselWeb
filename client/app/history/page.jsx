import React, { useEffect, useState } from "react";
import { personalizationService } from "../../services/personalizationService";
import ProtectedRoute from "../../components/ProtectedRoute";
import LoadingSpinner from "../../components/LoadingSpinner";
import EmptyState from "../../components/EmptyState";

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await personalizationService.getHistory();
        setHistory(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Recommendation History</h1>
        {history.length === 0 ? (
          <EmptyState title="No history" description="You haven't generated any recommendations yet." />
        ) : (
          <div className="space-y-4">
            {history.map((record, idx) => (
              <div key={idx} className="bg-white p-4 rounded border border-gray-200">
                <span className="text-sm text-gray-500">{new Date(record.timestamp).toLocaleDateString()}</span>
                <p className="font-medium">Target Score: {record.parameters?.targetScore}</p>
                <div className="mt-2 flex gap-2">
                  {record.results?.slice(0,3).map(r => (
                    <span key={r.collegeCode} className="bg-gray-100 px-2 py-1 text-xs rounded">{r.collegeCode}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
