// server/swagger.js
import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "CounselWise Recommendation API",
      version: "2.13.0",
      description:
        "Production-ready API for college recommendation matching. Returns sorted, paginated, and filtered college recommendations based on student preference weights.",
      contact: { name: "CounselWise Team" },
    },
    servers: [{ url: "http://localhost:5000", description: "Local Development" }],
    components: {
      schemas: {
        WeightPayload: {
          type: "object",
          description: "At least one weight must be provided. Weights must be non-negative.",
          properties: {
            academicsWeight: { type: "number", minimum: 0, example: 30 },
            placementsWeight: { type: "number", minimum: 0, example: 25 },
            infrastructureWeight: { type: "number", minimum: 0, example: 20 },
            trustWeight: { type: "number", minimum: 0, example: 15 },
            affordabilityWeight: { type: "number", minimum: 0, example: 5 },
            locationWeight: { type: "number", minimum: 0, example: 5 },
          },
          example: {
            academicsWeight: 30,
            placementsWeight: 25,
            infrastructureWeight: 20,
            trustWeight: 15,
            affordabilityWeight: 5,
            locationWeight: 5,
          },
        },
        PaginationMeta: {
          type: "object",
          required: ["page", "limit", "totalItems", "totalPages", "hasNextPage", "hasPreviousPage"],
          properties: {
            page: { type: "integer", minimum: 1, example: 1 },
            limit: { type: "integer", minimum: 1, maximum: 100, example: 20 },
            totalItems: { type: "integer", minimum: 0, example: 150 },
            totalPages: { type: "integer", minimum: 1, example: 8 },
            hasNextPage: { type: "boolean", example: true },
            hasPreviousPage: { type: "boolean", example: false },
          },
        },
        CollegeRecommendation: {
          type: "object",
          properties: {
            collegeCode: { type: ["integer", "string"], example: 1001 },
            collegeName: { type: "string", example: "JNTU College of Engineering" },
            matchScore: { type: "number", minimum: 0, maximum: 100, example: 87.5 },
            rankingScore: { type: ["number", "null"], example: 72.3 },
            trustScore: { type: ["number", "null"], example: 85.0 },
            factorBreakdown: { type: "object" },
            effectiveWeights: { type: "object" },
            explanation: { type: "object" },
            warnings: { type: "array", items: { type: "string" }, example: [] },
          },
        },
        RecommendationResponse: {
          type: "object",
          required: ["version", "generatedAt", "meta", "data"],
          properties: {
            version: { type: "string", pattern: "^2\\.12\\.\\d+$", example: "2.12.0" },
            generatedAt: { type: "string", format: "date-time" },
            meta: { $ref: "#/components/schemas/PaginationMeta" },
            data: { type: "array", items: { $ref: "#/components/schemas/CollegeRecommendation" } },
          },
        },
        HealthResponse: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["ok", "error"], example: "ok" },
            uptime: { type: "number", example: 3600.5 },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    paths: {
      "/api/match": {
        post: {
          summary: "Get college recommendations",
          description:
            "Returns a sorted, paginated, filtered list of colleges based on student preference weights. Responses are cached for 5 minutes per unique weight+filter+pagination combination. Rate limited to 60 req/min.",
          tags: ["Recommendations"],
          parameters: [
            { in: "query", name: "minimumMatchScore", schema: { type: "number", default: 0 }, description: "Filter colleges below this match score" },
            { in: "query", name: "minimumTrustScore", schema: { type: "number", default: 0 }, description: "Filter colleges below this trust score" },
            { in: "query", name: "minimumRankingScore", schema: { type: "number", default: 0 }, description: "Filter colleges below this ranking score" },
            { in: "query", name: "sortBy", schema: { type: "string", default: "matchScore", enum: ["matchScore", "rankingScore", "trustScore"] } },
            { in: "query", name: "sortOrder", schema: { type: "string", default: "desc", enum: ["asc", "desc"] } },
            { in: "query", name: "page", schema: { type: "integer", default: 1, minimum: 1 } },
            { in: "query", name: "limit", schema: { type: "integer", default: 20, minimum: 1, maximum: 100 } },
          ],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/WeightPayload" } } },
          },
          responses: {
            200: {
              description: "Successful recommendation response",
              content: { "application/json": { schema: { $ref: "#/components/schemas/RecommendationResponse" } } },
            },
            400: { description: "Invalid payload", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
            429: { description: "Rate limit exceeded" },
            500: { description: "Internal server error or schema validation failure" },
          },
        },
      },
      "/health": {
        get: {
          summary: "Basic liveness check",
          tags: ["Health"],
          responses: { 200: { description: "API is running", content: { "application/json": { schema: { $ref: "#/components/schemas/HealthResponse" } } } } },
        },
      },
      "/health/db": {
        get: {
          summary: "Database health check",
          tags: ["Health"],
          responses: { 200: { description: "DB connection status" }, 503: { description: "DB unavailable" } },
        },
      },
      "/health/recommendation": {
        get: {
          summary: "Recommendation service health check",
          tags: ["Health"],
          responses: { 200: { description: "Recommendation service status" }, 503: { description: "Service error" } },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
