const isDev = process.env.NODE_ENV !== "production" || import.meta.env?.DEV;

const logger = {
  log: (...args) => {
    if (isDev) {
      console.log(...args);
    }
  },
  error: (...args) => {
    if (isDev) {
      console.error(...args);
    }
  },
  warn: (...args) => {
    if (isDev) {
      console.warn(...args);
    }
  },
  info: (...args) => {
    if (isDev) {
      console.info(...args);
    }
  }
};

export default logger;
