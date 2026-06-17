import React from "react";

const ComparisonTable = ({ colleges }) => {
  if (!colleges || colleges.length === 0) return null;

  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="p-4 border-b border-gray-200 text-gray-500 font-medium">Metric</th>
            {colleges.map(c => (
              <th key={c.meta.collegeCode} className="p-4 border-b border-gray-200 font-bold text-gray-900 min-w-[200px]">
                {c.meta.shortName || c.meta.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-sm">
          <tr>
            <td className="p-4 border-b border-gray-100 font-medium text-gray-700">Location</td>
            {colleges.map(c => <td key={c.meta.collegeCode} className="p-4 border-b border-gray-100">{c.meta.location}</td>)}
          </tr>
          <tr>
            <td className="p-4 border-b border-gray-100 font-medium text-gray-700">Avg Package</td>
            {colleges.map(c => <td key={c.meta.collegeCode} className="p-4 border-b border-gray-100">₹{c.placements.averagePackageLPA} LPA</td>)}
          </tr>
          <tr>
            <td className="p-4 border-b border-gray-100 font-medium text-gray-700">Tuition Fee</td>
            {colleges.map(c => <td key={c.meta.collegeCode} className="p-4 border-b border-gray-100">₹{c.fees.averageTuition}</td>)}
          </tr>
          <tr>
            <td className="p-4 border-b border-gray-100 font-medium text-gray-700">NIRF Rank</td>
            {colleges.map(c => <td key={c.meta.collegeCode} className="p-4 border-b border-gray-100">{c.accreditation.nirfRank}</td>)}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default ComparisonTable;
