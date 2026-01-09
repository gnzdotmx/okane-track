describe('Config', () => {
  const originalEnv = process.env;
  const originalError = console.error;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    console.error = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    console.error = originalError;
  });

  describe('Default values', () => {
    beforeEach(() => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      process.env.JWT_SECRET = 'test-secret';
    });

    it('should use default port when PORT is not set', () => {
      delete process.env.PORT;

      const config = require('../index').default;
      expect(config.port).toBe(3001);
    });

    it('should use default nodeEnv when NODE_ENV is not set', () => {
      delete process.env.NODE_ENV;

      const config = require('../index').default;
      expect(config.nodeEnv).toBe('development');
    });

    it('should use DATABASE_URL from environment', () => {
      const config = require('../index').default;
      expect(config.databaseUrl).toBe('postgresql://test:test@localhost:5432/test');
    });

    it('should use JWT_SECRET from environment', () => {
      const config = require('../index').default;
      expect(config.jwt.secret).toBe('test-secret');
    });

    it('should use default JWT expiresIn when JWT_EXPIRES_IN is not set', () => {
      delete process.env.JWT_EXPIRES_IN;

      const config = require('../index').default;
      expect(config.jwt.expiresIn).toBe('7d');
    });

    it('should use default CORS origin when CORS_ORIGIN is not set', () => {
      delete process.env.CORS_ORIGIN;

      const config = require('../index').default;
      expect(config.cors.origin).toBe('http://localhost:3000');
    });

    it('should have correct upload configuration defaults', () => {
      const config = require('../index').default;
      expect(config.upload.maxFileSize).toBe(5 * 1024 * 1024);
      expect(config.upload.allowedTypes).toEqual(['.csv', '.xlsx']);
    });
  });

  describe('Environment variable overrides', () => {
    it('should use PORT from environment', () => {
      process.env.PORT = '8080';
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      process.env.JWT_SECRET = 'test-secret';

      const config = require('../index').default;
      expect(config.port).toBe(8080);
    });

    it('should use NODE_ENV from environment', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      process.env.JWT_SECRET = 'test-secret';

      const config = require('../index').default;
      expect(config.nodeEnv).toBe('production');
    });

    it('should use DATABASE_URL from environment', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/dbname';
      process.env.JWT_SECRET = 'test-secret';

      const config = require('../index').default;
      expect(config.databaseUrl).toBe('postgresql://user:pass@host:5432/dbname');
    });

    it('should use JWT_SECRET from environment', () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      process.env.JWT_SECRET = 'custom-secret-key';

      const config = require('../index').default;
      expect(config.jwt.secret).toBe('custom-secret-key');
    });

    it('should use JWT_EXPIRES_IN from environment', () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      process.env.JWT_SECRET = 'test-secret';
      process.env.JWT_EXPIRES_IN = '30d';

      const config = require('../index').default;
      expect(config.jwt.expiresIn).toBe('30d');
    });

    it('should use CORS_ORIGIN from environment', () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      process.env.JWT_SECRET = 'test-secret';
      process.env.CORS_ORIGIN = 'https://example.com';

      const config = require('../index').default;
      expect(config.cors.origin).toBe('https://example.com');
    });
  });

  describe('Required environment variables validation', () => {
    it('should throw error when DATABASE_URL is missing', () => {
      delete process.env.DATABASE_URL;
      process.env.JWT_SECRET = 'test-secret';

      expect(() => {
        require('../index');
      }).toThrow('Missing required environment variable: DATABASE_URL');
    });

    it('should throw error when JWT_SECRET is missing', () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      delete process.env.JWT_SECRET;

      expect(() => {
        require('../index');
      }).toThrow('Missing required environment variable: JWT_SECRET');
    });

    it('should throw error when both DATABASE_URL and JWT_SECRET are missing', () => {
      delete process.env.DATABASE_URL;
      delete process.env.JWT_SECRET;

      expect(() => {
        require('../index');
      }).toThrow('Missing required environment variable: DATABASE_URL');
    });

    it('should not throw when all required environment variables are set', () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      process.env.JWT_SECRET = 'test-secret';

      expect(() => {
        require('../index');
      }).not.toThrow();
    });
  });

  describe('Config structure', () => {
    beforeEach(() => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
      process.env.JWT_SECRET = 'test-secret';
    });

    it('should export config with all required properties', () => {
      const config = require('../index').default;

      expect(config).toHaveProperty('port');
      expect(config).toHaveProperty('nodeEnv');
      expect(config).toHaveProperty('databaseUrl');
      expect(config).toHaveProperty('jwt');
      expect(config).toHaveProperty('cors');
      expect(config).toHaveProperty('upload');
    });

    it('should have jwt object with secret and expiresIn', () => {
      const config = require('../index').default;

      expect(config.jwt).toHaveProperty('secret');
      expect(config.jwt).toHaveProperty('expiresIn');
      expect(typeof config.jwt.secret).toBe('string');
      expect(typeof config.jwt.expiresIn).toBe('string');
    });

    it('should have cors object with origin', () => {
      const config = require('../index').default;

      expect(config.cors).toHaveProperty('origin');
      expect(typeof config.cors.origin).toBe('string');
    });

    it('should have upload object with maxFileSize and allowedTypes', () => {
      const config = require('../index').default;

      expect(config.upload).toHaveProperty('maxFileSize');
      expect(config.upload).toHaveProperty('allowedTypes');
      expect(typeof config.upload.maxFileSize).toBe('number');
      expect(Array.isArray(config.upload.allowedTypes)).toBe(true);
    });

    it('should parse port as integer', () => {
      process.env.PORT = '8080';
      const config = require('../index').default;

      expect(config.port).toBe(8080);
      expect(Number.isInteger(config.port)).toBe(true);
    });
  });
});

