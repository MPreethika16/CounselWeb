import React, { useEffect, useState } from "react";
import { collegeService } from "../../services/collegeService";
import SkeletonLoader from "../../components/SkeletonLoader";
import EmptyState from "../../components/EmptyState";

// Simulated router param mapping for Next.js App Router
export default function CollegeDetailsPage({ params }) {
  const collegeCode = params?.collegeCode || "IITB"; // Default fallback for structural testing
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const result = await collegeService.getCollegeDetails(collegeCode);
        setData(result);
      } catch (err) {
        setError("Failed to load college details.");
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [collegeCode]);

  if (loading) return <SkeletonLoader type="table" />;
  if (error || !data) return <EmptyState title="College Not Found" description="The college code you requested doesn't exist." />;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{data.meta?.name}</h1>
        <p className="text-lg text-gray-600 mb-4">{data.meta?.location}</p>
        
        <div className="flex gap-4 mb-6">
          <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">
            NIRF Rank: {data.accreditation?.nirfRank}
          </span>
          <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
            Avg Package: ₹{data.placements?.averagePackageLPA} LPA
          </span>
          {data.trust?.confidenceScore > 80 && (
             <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium border border-blue-200">
             High Data Confidence ({data.trust.confidenceScore}%)
           </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-4">Academics & Admissions</h2>
          <ul className="space-y-3">
            <li className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Student-Faculty Ratio</span>
              <span className="font-medium">{data.academics?.facultyRatio}</span>
            </li>
            <li className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Programs Count</span>
              <span className="font-medium">{data.academics?.programsCount}</span>
            </li>
            <li className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Average Tuition</span>
              <span className="font-medium">₹{data.fees?.averageTuition}</span>
            </li>
          </ul>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-4">Placements & Outcomes</h2>
          <ul className="space-y-3">
            <li className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Highest Package</span>
              <span className="font-medium">₹{data.placements?.highestPackageLPA} LPA</span>
            </li>
            <li className="flex justify-between border-b pb-2">
              <span className="text-gray-600">Placement Rate</span>
              <span className="font-medium">{data.placements?.placementRate}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
