import React from "react";

const CollegeCard = ({ college, onSave, isSaved }) => {
  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative">
      {onSave && (
        <button 
          onClick={() => onSave(college.collegeCode)}
          className={`absolute top-4 right-4 p-2 rounded-full ${isSaved ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
        >
          <svg className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
          </svg>
        </button>
      )}
      
      <h2 className="text-xl font-bold text-gray-900 pr-10">{college.collegeName}</h2>
      <p className="text-sm text-gray-500 mb-4">{college.city}, {college.state}</p>
      
      <div className="space-y-2 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Avg Package:</span>
          <span className="font-medium">₹{college.placements?.averagePackageLPA || "N/A"} LPA</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Tuition:</span>
          <span className="font-medium">₹{college.fees?.averageTuition || "N/A"}</span>
        </div>
      </div>
      
      <a 
        href={`/college/${college.collegeCode}`} 
        className="block text-center w-full bg-gray-50 text-indigo-700 py-2 rounded-lg font-medium hover:bg-indigo-50 transition"
      >
        View Details
      </a>
    </div>
  );
};

export default CollegeCard;
