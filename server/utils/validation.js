// server/utils/validation.js
import Ajv from "ajv";

// validateFormats: false skips format keyword evaluation (date-time, etc.)
// This avoids "unknown format" errors while preserving structural validation.
const ajv = new Ajv({
  allErrors: true,
  strict: false,
  validateFormats: false,
});

/**
 * Validates data against a JSON schema. Throws on validation failure.
 * @param {object} schema - JSON schema definition.
 * @param {*} data - Data to validate.
 * @throws {Error} with `details` property containing Ajv errors.
 */
export function validateResponse(schema, data) {
  const validate = ajv.compile(schema);
  const valid = validate(data);
  if (!valid) {
    const err = new Error("Response validation failed");
    err.details = validate.errors;
    throw err;
  }
  return true;
}

