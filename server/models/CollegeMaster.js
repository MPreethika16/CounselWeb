import mongoose from "mongoose";

const facilityDetailSchema = {
  detected: { type: Boolean, default: false },
  confidence: { type: Number, default: 0 },
  evidence: {
    text: { type: String, default: "" },
    sourceUrl: { type: String, default: "" },
    matchedKeyword: { type: String, default: "" },
    matchedType: { type: String, default: "" }
  }
};

const collegeMasterSchema = new mongoose.Schema(
  {
    collegeCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    collegeName: {
      type: String,
      required: true,
      trim: true,
    },
    shortName: {
      type: String,
      default: "",
      trim: true,
    },
    district: {
      type: String,
      default: "",
      trim: true,
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },
    affiliation: {
      type: String,
      default: "",
      trim: true,
    },
    aliases: {
      type: [String],
      default: [],
    },
    officialWebsite: {
      url: {
        type: String,
        default: "",
        trim: true,
      },
      confidence: {
        type: Number,
        default: 0,
      },
      verified: {
        type: Boolean,
        default: false,
      },
      healthStatus: {
        type: String,
        default: "",
        trim: true,
      },
      canonicalDomain: {
        type: String,
        default: "",
        trim: true,
      },
      canonicalUrl: {
        type: String,
        default: "",
        trim: true,
      },
      health: {
        statusCode: { type: Number, default: null },
        responseTime: { type: Number, default: null },
        sslValid: { type: Boolean, default: null },
        redirected: { type: Boolean, default: null },
        redirectCount: { type: Number, default: 0 },
        finalUrl: { type: String, default: "", trim: true },
        robotsAccessible: { type: Boolean, default: null },
        healthy: { type: Boolean, default: false },
        lastCheckedAt: { type: Date, default: null },
        status: {
          type: String,
          enum: ["healthy", "warning", "critical"],
          default: "healthy"
        }
      },
    },
    discoveryStatus: {
      type: String,
      enum: ["pending", "discovered", "verified", "not_found", "review"],
      default: "pending",
    },
    officialData: {

      coverImage: {
        type: String,
        default: ""
      },

      gallery: {
        value: [
          {
            url: { type: String, required: true },
            category: { type: String, default: "other" },
            confidence: { type: Number, default: 0 },
            sourcePage: { type: String, default: "" }
          }
        ],
        sourceUrl: { type: String, default: "" },
        extractedAt: { type: Date, default: null }
      },

      freshness: {
        lastScrapedAt: { type: Date, default: null },
        lastVerifiedAt: { type: Date, default: null },
        score: { type: Number, default: 0 },
        classification: {
          type: String,
          enum: ["FRESH", "AGING", "STALE", "CRITICAL"],
          default: "CRITICAL"
        }
      },

      academics: {
        departments: { type: [String], default: [] },
        programs: { type: [String], default: [] },
        specializations: { type: [String], default: [] },
        intakeCapacity: { type: Number, default: null },
        facultyCount: { type: Number, default: null },
        studentFacultyRatio: { type: Number, default: null },
        curriculumUrls: { type: [String], default: [] },
        regulationUrls: { type: [String], default: [] },
        academicCalendarUrls: { type: [String], default: [] },
        confidence: { type: Number, default: 0 },
        lastVerifiedAt: { type: Date, default: null },
        sourceUrl: { type: String, default: "" },
        extractedAt: { type: Date, default: null }
      },

      fees: {
        annualFee: { type: Number, default: null },
        semesterFee: { type: Number, default: null },
        tuitionFee: { type: Number, default: null },
        hostelFee: { type: Number, default: null },
        transportFee: { type: Number, default: null },
        examFee: { type: Number, default: null },
        miscFee: { type: Number, default: null },
        feeYear: { type: String, default: "" },
        categoryQuota: { type: String, default: "" },
        confidence: { type: Number, default: 0 },
        currency: { type: String, default: "INR" },
        sourceUrl: { type: String, default: "" },
        extractedAt: { type: Date, default: null }
      },

      admissions: {
        eligibilityCriteria: { type: [String], default: [] },
        entranceExams: { type: [String], default: [] },
        eamcetRanks: { type: String, default: "" },
        jeeRanks: { type: String, default: "" },
        cutoffRanges: { type: String, default: "" },
        counselingProcess: { type: String, default: "" },
        managementQuota: { type: String, default: "" },
        nriQuota: { type: String, default: "" },
        requiredDocuments: { type: [String], default: [] },
        admissionContact: { type: String, default: "" },
        cutoffRank: { type: Number, default: null },
        applicationDeadline: { type: String, default: "" },
        confidence: { type: Number, default: 0 },
        sourceUrl: { type: String, default: "" },
        extractedAt: { type: Date, default: null }
      },
      contact: {
        phones: [
          {
            number: { type: String, required: true },
            category: { type: String, default: "general" }
          }
        ],
        emails: { type: [String], default: [] },
        socialLinks: {
          facebook: {
            url: { type: String, default: "" },
            verified: { type: Boolean, default: false },
            confidence: { type: Number, default: 0 }
          },
          instagram: {
            url: { type: String, default: "" },
            verified: { type: Boolean, default: false },
            confidence: { type: Number, default: 0 }
          },
          linkedin: {
            url: { type: String, default: "" },
            verified: { type: Boolean, default: false },
            confidence: { type: Number, default: 0 }
          },
          youtube: {
            url: { type: String, default: "" },
            verified: { type: Boolean, default: false },
            confidence: { type: Number, default: 0 }
          },
          twitter: {
            url: { type: String, default: "" },
            verified: { type: Boolean, default: false },
            confidence: { type: Number, default: 0 }
          }
        },
        confidence: { type: Number, default: 0 },
        sourceUrl: { type: String, default: "" },
        evidenceText: { type: String, default: "" },
        extractedAt: { type: Date, default: null }
      },
      address: {
        fullAddress: { type: String, default: "" },
        city: { type: String, default: "" },
        mandal: { type: String, default: "" },
        district: { type: String, default: "" },
        state: { type: String, default: "" },
        pincode: { type: String, default: "" },
        googleMapsUrl: { type: String, default: "" },
        confidence: { type: Number, default: 0 },
        sourceUrl: { type: String, default: "" },
        evidenceText: { type: String, default: "" },
        extractedAt: { type: Date, default: null }
      },
      facilities: {
        library: facilityDetailSchema,
        digitalLibrary: facilityDetailSchema,
        hostelBoys: facilityDetailSchema,
        hostelGirls: facilityDetailSchema,
        sports: facilityDetailSchema,
        gym: facilityDetailSchema,
        cafeteria: facilityDetailSchema,
        transport: facilityDetailSchema,
        wifi: facilityDetailSchema,
        medical: facilityDetailSchema,
        auditorium: facilityDetailSchema,
        seminarHall: facilityDetailSchema,
        laboratories: facilityDetailSchema,
        computerLabs: facilityDetailSchema,
        innovationCenter: facilityDetailSchema,
        incubationCenter: facilityDetailSchema,
        bankAtm: facilityDetailSchema,
        guestHouse: facilityDetailSchema,
        extractedAt: { type: Date, default: null }
      },
      facilitiesCount: {
        type: Number,
        default: 0
      },
      facilityCoverageScore: {
        type: Number,
        default: 0
      },
      facilityQualityScore: {
        type: Number,
        default: 0
      },
      facilityStrengthScore: {
        type: Number,
        default: 0
      },
      facilitiesCoverage: {
        facilitiesPage: { type: Boolean, default: false },
        infrastructurePage: { type: Boolean, default: false },
        hostelPage: { type: Boolean, default: false },
        libraryPage: { type: Boolean, default: false },
        sportsPage: { type: Boolean, default: false }
      },
      coverageDetails: {
        attemptedPages: { type: Number, default: 0 },
        successfulPages: { type: Number, default: 0 },
        failedPages: { type: Number, default: 0 }
      },
      accreditation: {
        naacGrade: { type: String, default: "" },
        naacScore: { type: Number, default: null }, // NAAC CGPA
        naacValidity: { type: String, default: "" },
        naacCycle: { type: Number, default: null },
        nbaAccredited: { type: Boolean, default: false },
        nbaValidity: { type: String, default: "" },
        nbaPrograms: { type: [String], default: [] },
        autonomous: { type: Boolean, default: false },
        affiliation: { type: String, default: "" },
        ugcRecognized: { type: Boolean, default: false },
        aicteApproved: { type: Boolean, default: false },
        nirfRank: { type: Number, default: null },
        nirfParticipated: { type: Boolean, default: false },

        // Affiliation cross-validation
        reviewRequired: { type: Boolean, default: false },
        affiliationSource: { type: String, default: "" }, // "extracted" | "master" | "mismatch"

        confidence: { type: Number, default: 0 },
        sourceUrl: { type: String, default: "" },
        evidenceText: { type: String, default: "" },
        extractedAt: { type: Date, default: null }
      },
      rankings: [
        {
          agency: { type: String, default: "" },
          category: { type: String, default: "" },
          rank: { type: Number, default: null },
          year: { type: Number, default: null },
          score: { type: Number, default: null },
          sourceUrl: { type: String, default: "" }
        }
      ],
      accreditationHistory: [
        {
          naacGrade: { type: String, default: "" },
          nbaAccredited: { type: Boolean, default: false },
          autonomous: { type: Boolean, default: false },
          affiliation: { type: String, default: "" },
          confidence: { type: Number, default: 0 },
          sourceUrl: { type: String, default: "" },
          snapshotAt: { type: Date, default: null }
        }
      ],
      placements: {
        highestPackage: { type: Number, default: null },
        averagePackage: { type: Number, default: null },
        medianPackage: { type: Number, default: null },
        placementPercentage: { type: Number, default: null },
        totalOffers: { type: Number, default: null },
        totalPlacedStudents: { type: Number, default: null },
        recruiters: [
          {
            name: { type: String, required: true },
            confidence: { type: Number, default: 0 },
            sourceUrl: { type: String, default: "" },
            evidenceText: { type: String, default: "" }
          }
        ],
        placementYear: { type: Number, default: null },
        placementYearEvidence: { type: String, default: "" },
        branchPlacements: [
          {
            branch: { type: String, default: "" },
            highestPackage: { type: Number, default: null },
            averagePackage: { type: Number, default: null },
            placedPercentage: { type: Number, default: null }
          }
        ],
        internshipData: {
          highestStipend: { type: Number, default: null },
          averageStipend: { type: Number, default: null },
          companies: { type: [String], default: [] }
        },
        sourceType: { type: String, default: "" }, // "official_pdf" | "official_placement_page" | "annual_report" | "general_page"
        confidence: { type: Number, default: 0 },
        sourceUrl: { type: String, default: "" },
        evidenceText: { type: String, default: "" },
        extractedAt: { type: Date, default: null },
        suspicious: { type: Boolean, default: false },
        reviewReason: { type: String, default: "" },
        reviewRequired: { type: Boolean, default: false },
        recruitersCount: { type: Number, default: 0 },
        sourceSummary: {
          primarySourceType: { type: String, default: "" },
          primarySourceUrl: { type: String, default: "" }
        },
        lineage: {
          highestPackage: {
            sourceUrl: { type: String, default: "" },
            sourceType: { type: String, default: "" },
            extractedAt: { type: Date, default: null },
            evidenceText: { type: String, default: "" }
          },
          averagePackage: {
            sourceUrl: { type: String, default: "" },
            sourceType: { type: String, default: "" },
            extractedAt: { type: Date, default: null },
            evidenceText: { type: String, default: "" }
          },
          medianPackage: {
            sourceUrl: { type: String, default: "" },
            sourceType: { type: String, default: "" },
            extractedAt: { type: Date, default: null },
            evidenceText: { type: String, default: "" }
          },
          placementPercentage: {
            sourceUrl: { type: String, default: "" },
            sourceType: { type: String, default: "" },
            extractedAt: { type: Date, default: null },
            evidenceText: { type: String, default: "" }
          },
          totalOffers: {
            sourceUrl: { type: String, default: "" },
            sourceType: { type: String, default: "" },
            extractedAt: { type: Date, default: null },
            evidenceText: { type: String, default: "" }
          },
          totalPlacedStudents: {
            sourceUrl: { type: String, default: "" },
            sourceType: { type: String, default: "" },
            extractedAt: { type: Date, default: null },
            evidenceText: { type: String, default: "" }
          },
          placementYear: {
            sourceUrl: { type: String, default: "" },
            sourceType: { type: String, default: "" },
            extractedAt: { type: Date, default: null },
            evidenceText: { type: String, default: "" }
          }
        }
      },
      profileCompleteness: {
        score: { type: Number, default: 0 },
        breakdown: {
          website: { type: Number, default: 0 },
          gallery: { type: Number, default: 0 },
          contact: { type: Number, default: 0 },
          address: { type: Number, default: 0 },
          facilities: { type: Number, default: 0 },
          accreditation: { type: Number, default: 0 },
          placements: { type: Number, default: 0 },
          health: { type: Number, default: 0 }
        },
        missingSections: { type: [String], default: [] },
        lastCalculatedAt: { type: Date, default: null }
      },
      trustScore: {
        score: { type: Number, default: 0 },
        breakdown: {
          websiteVerification: { type: Number, default: 0 },
          websiteHealth: { type: Number, default: 0 },
          galleryQuality: { type: Number, default: 0 },
          contactQuality: { type: Number, default: 0 },
          facilitiesQuality: { type: Number, default: 0 },
          accreditationQuality: { type: Number, default: 0 },
          placementQuality: { type: Number, default: 0 },
          dataFreshness: { type: Number, default: 0 }
        },
        reviewFlags: { type: [String], default: [] },
        lastCalculatedAt: { type: Date, default: null }
      },
    recommendationFactors: {
      academicStrength: { type: Number, default: 0 },
      placementStrength: { type: Number, default: 0 },
      infrastructureStrength: { type: Number, default: 0 },
      trustStrength: { type: Number, default: 0 },
      affordabilityStrength: { type: Number, default: null },
      locationStrength: { type: Number, default: null },
      affordabilityDataAvailable: { type: Boolean, default: false },
      locationDataAvailable: { type: Boolean, default: false },
      locationMetadata: {
        city: { type: String, default: "" },
        state: { type: String, default: "" },
        district: { type: String, default: "" },
        geoAvailable: { type: Boolean, default: false }
      }
    },
      ranking: {
        overallScore: { type: Number, default: 0 },
        academicScore: { type: Number, default: 0 },
        infrastructureScore: { type: Number, default: 0 },
        placementScore: { type: Number, default: 0 },
        trustScoreContribution: { type: Number, default: 0 },
        completenessContribution: { type: Number, default: 0 },
        rankingVersion: { type: String, default: "" },
        calculatedAt: { type: Date, default: null }
      },
      reviewStatus: {
        status: {
          type: String,
          enum: ["approved", "pending_review", "rejected", "not_required"],
          default: "pending_review"
        },
        reviewQueuePriority: {
          type: String,
          enum: ["Critical", "High", "Medium", "none"],
          default: "none"
        },
        reviewReasons: { type: [String], default: [] },
        improvementFlags: { type: [String], default: [] },
        trustDeficiencies: { type: [String], default: [] },
        reviewedBy: { type: String, default: "" },
        reviewedAt: { type: Date, default: null },
        notes: { type: String, default: "" }
      }
    },
    metadata: {
      createdFromAudit: {
        type: Boolean,
        default: false,
      },
      normalizedAt: {
        type: Date,
        default: null,
      },
    },
    state: {
      type: String,
      default: "",
      trim: true,
      index: true
    },
    city: {
      type: String,
      default: "",
      trim: true,
      index: true
    }
  },
  {
    timestamps: true,
  }
);

// Indexes for Production Optimization
collegeMasterSchema.index({ state: 1, city: 1 });
collegeMasterSchema.index({ "officialData.accreditation.nirfRank": 1 });
collegeMasterSchema.index({ "officialData.fees.tuitionFee": 1 });
collegeMasterSchema.index({ "officialData.accreditation.naacGrade": 1 });
collegeMasterSchema.index({
  collegeName: "text",
  shortName: "text",
  state: "text",
  city: "text",
  "officialData.academics.ugCourses.name": "text",
  "officialData.academics.pgCourses.name": "text"
});

export default mongoose.model("CollegeMaster", collegeMasterSchema);
