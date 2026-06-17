import College from "../models/College.js";

export const databaseAuditService = {
  runIntegrityAudit: async () => {
    const totalColleges = await College.countDocuments();
    
    // 1. Duplicate College Codes
    const duplicateCollegeCodesAgg = await College.aggregate([
      { $group: { _id: "$collegeCode", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $project: { _id: 0, code: "$_id", count: 1 } }
    ]);

    // 2. Duplicate Names
    const duplicateNamesAgg = await College.aggregate([
      { $group: { _id: "$meta.name", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $project: { _id: 0, name: "$_id", count: 1 } }
    ]);

    // 3. Duplicate Websites
    const duplicateWebsitesAgg = await College.aggregate([
      { $match: { "officialData.website": { $ne: null, $ne: "" } } },
      { $group: { _id: "$officialData.website", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $project: { _id: 0, website: "$_id", count: 1 } }
    ]);

    // 4. Empty Records (Missing code or name)
    const emptyRecordsCount = await College.countDocuments({
      $or: [
        { collegeCode: { $exists: false } },
        { "meta.name": { $exists: false } },
        { "meta.name": "" }
      ]
    });

    // 5. Missing Critical Fields
    const missingCriticalFieldsAgg = await College.aggregate([
      {
        $group: {
          _id: null,
          missingCity: { $sum: { $cond: [{ $eq: ["$meta.city", null] }, 1, 0] } },
          missingState: { $sum: { $cond: [{ $eq: ["$meta.state", null] }, 1, 0] } }
        }
      }
    ]);

    const missingCriticalFields = missingCriticalFieldsAgg[0] || { missingCity: 0, missingState: 0 };

    return {
      totalColleges,
      duplicateCollegeCodes: duplicateCollegeCodesAgg.length,
      duplicateWebsites: duplicateWebsitesAgg.length,
      duplicateNames: duplicateNamesAgg.length,
      emptyRecords: emptyRecordsCount,
      missingCriticalFields
    };
  }
};
