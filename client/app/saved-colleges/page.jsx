import React, { useEffect, useState } from "react";
import { personalizationService } from "../../services/personalizationService";
import ProtectedRoute from "../../components/ProtectedRoute";
import CollegeCard from "../../components/CollegeCard";
import SkeletonLoader from "../../components/SkeletonLoader";
import EmptyState from "../../components/EmptyState";

export default function SavedCollegesPage() {
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSaved = async () => {
      try {
        const data = await personalizationService.getSavedColleges();
        setColleges(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSaved();
  }, []);

  const handleRemove = async (code) => {
    await personalizationService.removeSavedCollege(code);
    setColleges(colleges.filter(c => c.collegeCode !== code));
  };

  if (loading) return <SkeletonLoader type="card" count={4} />;
  
  return (
    <ProtectedRoute>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Saved Colleges</h1>
        {colleges.length === 0 ? (
          <EmptyState title="No saved colleges" description="You haven't saved any colleges yet. Start searching to add some." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {colleges.map(college => (
              <CollegeCard 
                key={college.collegeCode} 
                college={college} 
                isSaved={true} 
                onSave={handleRemove} 
              />
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
