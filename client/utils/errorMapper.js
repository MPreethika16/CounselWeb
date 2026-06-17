export const errorMapper = (error) => {
  if (!error.response) {
    if (error.message.includes("Network Error")) {
      return "Network Error: Please check your internet connection and try again.";
    }
    if (error.code === 'ECONNABORTED') {
      return "Request Timeout: The server took too long to respond.";
    }
    return error.message || "An unexpected error occurred.";
  }

  const { status, data } = error.response;
  const serverMessage = data?.error || data?.message;

  switch (status) {
    case 400:
      return serverMessage || "Invalid request. Please check your inputs.";
    case 401:
      return "Your session has expired. Please log in again.";
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "The requested resource could not be found.";
    case 429:
      return "Too many requests. Please slow down and try again later.";
    case 500:
    case 502:
    case 503:
    case 504:
      return "The server encountered a problem. Our engineers have been notified.";
    default:
      return serverMessage || `Unexpected Error (${status})`;
  }
};
