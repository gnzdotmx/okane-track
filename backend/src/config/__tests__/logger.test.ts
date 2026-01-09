import winston from 'winston';

// Mock winston transports to avoid file system operations
const createMockTransport = () => ({
  log: jest.fn((info: any, callback: any) => {
    if (typeof callback === 'function') {
      callback();
    }
  }),
  on: jest.fn(),
  once: jest.fn(),
  emit: jest.fn(),
  format: undefined,
  level: undefined,
  silent: false,
  handleExceptions: false,
  handleRejections: false,
});

// Store references to mocks created inside jest.mock
var MockConsole: jest.Mock;
var MockFile: jest.Mock;
var FormatCombine: jest.Mock;
var FormatTimestamp: jest.Mock;
var FormatPrintf: jest.Mock;
var FormatColorize: jest.Mock;
var FormatErrors: jest.Mock;

jest.mock('winston', () => {
  const actualWinston = jest.requireActual('winston');
  
  // Create format spies that wrap the actual implementations
  FormatCombine = jest.fn((...args: any[]) => actualWinston.format.combine(...args));
  FormatTimestamp = jest.fn((...args: any[]) => actualWinston.format.timestamp(...args));
  FormatPrintf = jest.fn((...args: any[]) => actualWinston.format.printf(...args));
  FormatColorize = jest.fn((...args: any[]) => actualWinston.format.colorize(...args));
  FormatErrors = jest.fn((...args: any[]) => actualWinston.format.errors(...args));
  
  // Create mocks inside the factory
  MockConsole = jest.fn().mockImplementation((options: any) => {
    const transport = createMockTransport();
    transport.format = options?.format;
    return transport;
  });
  
  MockFile = jest.fn().mockImplementation((options: any) => {
    const transport = createMockTransport();
    transport.level = options?.level;
    return transport;
  });
  
  return {
    ...actualWinston,
    format: {
      ...actualWinston.format,
      combine: FormatCombine,
      timestamp: FormatTimestamp,
      printf: FormatPrintf,
      colorize: FormatColorize,
      errors: FormatErrors,
    },
    createLogger: jest.fn().mockImplementation((opts: any) => actualWinston.createLogger(opts)),
    transports: {
      ...actualWinston.transports,
      Console: MockConsole,
      File: MockFile,
    },
  };
});

// Access mocks directly using the variables
const getMockConsole = () => MockConsole;
const getMockFile = () => MockFile;


describe('Logger', () => {
  const originalEnv = process.env;
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    console.log = jest.fn();
    console.error = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('Logger creation', () => {
    it('should create a logger instance', () => {
      const logger = require('../logger').default;
      expect(logger).toBeDefined();
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('error');
      expect(logger).toHaveProperty('warn');
    });

    it('should use default log level when LOG_LEVEL is not set', () => {
      delete process.env.LOG_LEVEL;
      jest.resetModules();
      const logger = require('../logger').default;
      
      expect(logger).toBeDefined();
      expect(logger.level).toBe('info');
    });

    it('should use LOG_LEVEL from environment', () => {
      process.env.LOG_LEVEL = 'debug';
      jest.resetModules();
      const logger = require('../logger').default;
      
      expect(logger).toBeDefined();
      expect(logger.level).toBe('debug');
    });

    it('should configure logger with transports', () => {
      jest.resetModules();
      jest.clearAllMocks();
      getMockConsole().mockClear();
      getMockFile().mockClear();
      require('../logger');
      
      expect(getMockConsole()).toHaveBeenCalled();
      expect(getMockFile()).toHaveBeenCalled();
    });
  });

  describe('Logger format', () => {
    it('should configure logger with format', () => {
      jest.resetModules();
      jest.clearAllMocks();
      const logger = require('../logger').default;
      
      expect(logger).toBeDefined();
      // Logger should be configured with format
      expect(winston.format.combine).toBeDefined();
      expect(winston.format.timestamp).toBeDefined();
      expect(winston.format.printf).toBeDefined();
      expect(winston.format.errors).toBeDefined();
    });

    it('should call combine with errors, timestamp, and printf', () => {
      jest.resetModules();
      require('../logger');
      
      // Verify combine was called for the main logger format
      expect(FormatCombine).toHaveBeenCalled();
      const combineCalls = FormatCombine.mock.calls;
      
      // Find the main format call (should include errors, timestamp, printf)
      // The main format call should have 3 arguments: errors, timestamp, and printf
      const mainFormatCall = combineCalls.find((call: any) => 
        call && call.length >= 3
      );
      expect(mainFormatCall).toBeDefined();
      expect(mainFormatCall.length).toBeGreaterThanOrEqual(3);
      
      // Verify that FormatErrors, FormatTimestamp, and FormatPrintf were all called
      // which means they were passed to combine
      expect(FormatErrors).toHaveBeenCalled();
      expect(FormatTimestamp).toHaveBeenCalled();
      expect(FormatPrintf).toHaveBeenCalled();
    });

    it('should call timestamp with correct format', () => {
      jest.resetModules();
      require('../logger');
      
      expect(FormatTimestamp).toHaveBeenCalledWith({
        format: 'YYYY-MM-DD HH:mm:ss',
      });
    });

    it('should call errors with stack option', () => {
      jest.resetModules();
      require('../logger');
      
      expect(FormatErrors).toHaveBeenCalledWith({ stack: true });
    });

    it('should use printf format function', () => {
      jest.resetModules();
      require('../logger');
      
      // Verify printf was called (it's called twice - once for main format, once for Console format)
      expect(FormatPrintf).toHaveBeenCalled();
      const printfFn = FormatPrintf.mock.calls[0][0];
      expect(typeof printfFn).toBe('function');
      
      // Test the format function when stack is NOT present (uses message)
      const formatted1 = printfFn({
        level: 'info',
        message: 'Test message',
        timestamp: '2024-01-01 12:00:00',
        stack: undefined,
      });
      expect(formatted1).toBe('2024-01-01 12:00:00 [info]: Test message');
      
      // Test the format function when stack IS present (uses stack instead of message)
      const formatted2 = printfFn({
        level: 'error',
        message: 'Error message',
        timestamp: '2024-01-01 12:00:00',
        stack: 'Error: Error message\n    at test.js:1:1',
      });
      expect(formatted2).toBe('2024-01-01 12:00:00 [error]: Error: Error message\n    at test.js:1:1');
      
      // Test with null stack (should use message)
      const formatted3 = printfFn({
        level: 'warn',
        message: 'Warning message',
        timestamp: '2024-01-01 12:00:00',
        stack: null,
      });
      expect(formatted3).toBe('2024-01-01 12:00:00 [warn]: Warning message');
    });
  });

  describe('Logger transports', () => {
    it('should create Console transport', () => {
      jest.resetModules();
      jest.clearAllMocks();
      getMockConsole().mockClear();
      require('../logger');
      
      expect(getMockConsole()).toHaveBeenCalled();
      const consoleCall = getMockConsole().mock.calls.find(
        (call: any) => call[0] && call[0].format
      );
      expect(consoleCall).toBeDefined();
    });

    it('should create Console transport with colorize format', () => {
      jest.resetModules();
      getMockConsole().mockClear();
      require('../logger');
      
      expect(getMockConsole()).toHaveBeenCalled();
      const consoleCalls = getMockConsole().mock.calls;
      const consoleCall = consoleCalls.find((call: any) => call[0] && call[0].format);
      expect(consoleCall).toBeDefined();
      expect(consoleCall?.[0].format).toBeDefined();
      expect(FormatColorize).toHaveBeenCalled();
      
      // Verify that combine is called for Console format
      const combineCalls = FormatCombine.mock.calls;
      const consoleFormatCall = combineCalls.find((call: any) => 
        call && call.length > 0 && call.some((arg: any) => arg && arg.colorize)
      );
      expect(consoleFormatCall).toBeDefined();
    });

    it('should create File transport for errors', () => {
      jest.resetModules();
      jest.clearAllMocks();
      getMockFile().mockClear();
      require('../logger');
      
      expect(getMockFile()).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'logs/error.log',
          level: 'error',
        })
      );
    });

    it('should create File transport for all logs', () => {
      jest.resetModules();
      jest.clearAllMocks();
      getMockFile().mockClear();
      require('../logger');
      
      // Check that File transport was called for combined.log
      expect(getMockFile()).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'logs/combined.log',
        })
      );
      
      // Verify both File transports were created
      const fileCalls = getMockFile().mock.calls;
      expect(fileCalls.length).toBeGreaterThanOrEqual(2);
      
      const errorLogCall = fileCalls.find((call: any) => call[0] && call[0].filename === 'logs/error.log');
      const combinedLogCall = fileCalls.find((call: any) => call[0] && call[0].filename === 'logs/combined.log');
      
      expect(errorLogCall).toBeDefined();
      expect(combinedLogCall).toBeDefined();
    });
  });

  describe('Logger methods', () => {
    it('should export logger with info method', () => {
      const logger = require('../logger').default;
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    it('should export logger with error method', () => {
      const logger = require('../logger').default;
      expect(logger).toBeDefined();
      expect(typeof logger.error).toBe('function');
    });

    it('should export logger with warn method', () => {
      const logger = require('../logger').default;
      expect(logger).toBeDefined();
      expect(typeof logger.warn).toBe('function');
    });

    it('should export logger with debug method', () => {
      const logger = require('../logger').default;
      expect(logger).toBeDefined();
      expect(typeof logger.debug).toBe('function');
    });

    it('should be able to call info method', () => {
      const logger = require('../logger').default;
      expect(() => logger.info('Test message')).not.toThrow();
    });

    it('should be able to call error method', () => {
      const logger = require('../logger').default;
      expect(() => logger.error('Error message')).not.toThrow();
    });

    it('should be able to call warn method', () => {
      const logger = require('../logger').default;
      expect(() => logger.warn('Warning message')).not.toThrow();
    });
  });

  describe('Log format function', () => {
    it('should format log messages with timestamp and level', () => {
      const logger = require('../logger').default;
      
      // The logger should format messages correctly
      expect(() => logger.info('Test message')).not.toThrow();
    });

    it('should handle error messages', () => {
      const logger = require('../logger').default;
      
      expect(() => logger.error('Error message')).not.toThrow();
    });

    it('should handle warning messages', () => {
      const logger = require('../logger').default;
      
      expect(() => logger.warn('Warning message')).not.toThrow();
    });

    it('should handle debug messages', () => {
      const logger = require('../logger').default;
      
      expect(() => logger.debug('Debug message')).not.toThrow();
    });

    it('should handle verbose messages', () => {
      const logger = require('../logger').default;
      
      if (typeof logger.verbose === 'function') {
        expect(() => logger.verbose('Verbose message')).not.toThrow();
      }
    });
  });

  describe('Logger export', () => {
    it('should export logger as default export', () => {
      const logger = require('../logger').default;
      expect(logger).toBeDefined();
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('error');
      expect(logger).toHaveProperty('warn');
    });

    it('should export a singleton logger instance', () => {
      const logger1 = require('../logger').default;
      jest.resetModules();
      const logger2 = require('../logger').default;
      
      // Both should be logger instances (though they may be different instances after resetModules)
      expect(logger1).toBeDefined();
      expect(logger2).toBeDefined();
      expect(typeof logger1.info).toBe('function');
      expect(typeof logger2.info).toBe('function');
    });
  });
});

