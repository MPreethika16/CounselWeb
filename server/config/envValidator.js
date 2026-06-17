/**
 * Validates the presence of required environment variables before allowing the server to boot.
 * Fails fast to prevent runtime cryptographic or connection errors.
 */
export function validateEnvironment() {
  const required = ["MONGODB_URI", "JWT_SECRET", "REFRESH_SECRET"];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error(`[FATAL] Missing required environment variables: ${missing.join(", ")}`);
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    } else {
      console.warn(`[WARNING] Proceeding in ${process.env.NODE_ENV || 'dev'} mode despite missing variables.`);
    }
  }

  if (process.env.NODE_ENV === "production" && process.env.JWT_SECRET === "please_change_this_secret_in_prod") {
    console.error(`[FATAL] Default JWT_SECRET detected in production! This is a massive security risk.`);
    process.exit(1);
  }
}
