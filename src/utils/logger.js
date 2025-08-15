// Centralized logging system for the Deathwatch Roller application

class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000; // Keep last 1000 logs
    this.logToConsole = true;
    this.logToStorage = true;
    this.storageKey = 'dw:logs';
    
    // Load existing logs from localStorage
    this.loadLogs();
  }

  loadLogs() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load logs from localStorage:', error);
    }
  }

  saveLogs() {
    try {
      if (this.logToStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
      }
    } catch (error) {
      console.error('Failed to save logs to localStorage:', error);
    }
  }

  addLog(level, component, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      component,
      message,
      data: data ? JSON.stringify(data) : null,
      id: Date.now() + Math.random()
    };

    this.logs.push(logEntry);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output
    if (this.logToConsole) {
      const consoleMessage = `[${timestamp}] ${level.toUpperCase()} [${component}] ${message}`;
      
      switch (level) {
        case 'error':
          console.error(consoleMessage, data);
          break;
        case 'warn':
          console.warn(consoleMessage, data);
          break;
        case 'info':
          console.info(consoleMessage, data);
          break;
        case 'debug':
        default:
          console.log(consoleMessage, data);
          break;
      }
    }

    // Save to localStorage
    this.saveLogs();

    return logEntry;
  }

  debug(component, message, data) {
    return this.addLog('debug', component, message, data);
  }

  info(component, message, data) {
    return this.addLog('info', component, message, data);
  }

  warn(component, message, data) {
    return this.addLog('warn', component, message, data);
  }

  error(component, message, data) {
    return this.addLog('error', component, message, data);
  }

  // Get logs with optional filtering
  getLogs(options = {}) {
    let filteredLogs = [...this.logs];

    if (options.level) {
      filteredLogs = filteredLogs.filter(log => log.level === options.level);
    }

    if (options.component) {
      filteredLogs = filteredLogs.filter(log => log.component === options.component);
    }

    if (options.since) {
      const sinceTime = new Date(options.since);
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= sinceTime);
    }

    if (options.limit) {
      filteredLogs = filteredLogs.slice(-options.limit);
    }

    return filteredLogs;
  }

  // Clear all logs
  clearLogs() {
    this.logs = [];
    this.saveLogs();
  }

  // Export logs as JSON
  exportLogs() {
    return {
      exportDate: new Date().toISOString(),
      logCount: this.logs.length,
      logs: this.logs
    };
  }

  // Get summary of recent activity
  getSummary(minutes = 60) {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    const recentLogs = this.getLogs({ since });
    
    const summary = {
      total: recentLogs.length,
      byLevel: {},
      byComponent: {},
      errors: recentLogs.filter(log => log.level === 'error'),
      warnings: recentLogs.filter(log => log.level === 'warn')
    };

    recentLogs.forEach(log => {
      summary.byLevel[log.level] = (summary.byLevel[log.level] || 0) + 1;
      summary.byComponent[log.component] = (summary.byComponent[log.component] || 0) + 1;
    });

    return summary;
  }
}

// Create singleton instance
const logger = new Logger();

// Export the logger instance and convenient methods
export default logger;

export const debug = (component, message, data) => logger.debug(component, message, data);
export const info = (component, message, data) => logger.info(component, message, data);
export const warn = (component, message, data) => logger.warn(component, message, data);
export const error = (component, message, data) => logger.error(component, message, data);

// Helper functions for common logging patterns
export const logApiCall = (component, method, url, data) => {
  info(component, `API ${method} ${url}`, data);
};

export const logApiError = (component, method, url, error) => {
  logger.error(component, `API ${method} ${url} failed`, {
    message: error.message,
    status: error.response?.status,
    data: error.response?.data
  });
};

export const logUserAction = (component, action, data) => {
  info(component, `User action: ${action}`, data);
};

export const logStateChange = (component, stateName, oldValue, newValue) => {
  debug(component, `State change: ${stateName}`, { oldValue, newValue });
};

// Development helper - add logger to window for debugging
if (process.env.NODE_ENV === 'development') {
  window.dwLogger = logger;
}
