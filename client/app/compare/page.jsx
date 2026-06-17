import React, { useState, useEffect } from "react";
import { comparisonService } from "../../services/comparisonService";
import ComparisonTable from "../../components/ComparisonTable";
import SkeletonLoader from "../../components/SkeletonLoader";
import EmptyState from "../../components/EmptyState";

export default function ComparePage() {
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, these codes would come from URL query params or Context
    const fetchComparison = async () => {
      try {
        const data = await comparisonService.compareColleges(["IITB", "IITD"]);
        setColleges(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchComparison();
  }, []);

  if (loading) return <SkeletonLoader type="table" />;
  if (colleges.length < 2) return <EmptyState title="Not enough colleges to compare" description="Select at least two colleges from the search page to compare them." />;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">College Comparison</h1>
      <p className="text-gray-600 mb-8">Side-by-side analysis of your selected institutions.</p>
      <ComparisonTable colleges={colleges} />
    </div>
  );
}
