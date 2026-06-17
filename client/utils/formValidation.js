export const formValidation = {
  validateEmail: (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email) ? null : "Please enter a valid email address.";
  },
  
  validatePassword: (password) => {
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
    if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
    return null;
  },

  validateRequired: (value, fieldName) => {
    if (!value || String(value).trim() === "") return `${fieldName} is required.`;
    return null;
  },

  validateRange: (value, min, max, fieldName) => {
    const num = Number(value);
    if (isNaN(num)) return `${fieldName} must be a number.`;
    if (num < min || num > max) return `${fieldName} must be between ${min} and ${max}.`;
    return null;
  }
};
