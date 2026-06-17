import React from "react";

const SkeletonLoader = ({ type = "card", count = 3 }) => {
  const items = Array.from({ length: count });

  if (type === "table") {
    return (
      <div className="w-full bg-white rounded-lg shadow-sm p-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-full mb-4"></div>
        {items.map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded w-full mb-2"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((_, i) => (
        <div key={i} className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-100 rounded"></div>
            <div className="h-3 bg-gray-100 rounded w-5/6"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SkeletonLoader;
