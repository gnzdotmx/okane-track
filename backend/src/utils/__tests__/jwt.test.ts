// Mock dependencies
const mockJwtSign = jest.fn();
const mockJwtVerify = jest.fn();

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    sign: mockJwtSign,
    verify: mockJwtVerify,
  },
}));

jest.mock('../../config', () => ({
  __esModule: true,
  default: {
    jwt: {
      secret: 'test-secret-key',
      expiresIn: '7d',
    },
  },
}));

import { generateToken, verifyToken } from '../jwt';
import jwt from 'jsonwebtoken';

describe('jwt utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate a JWT token with payload', () => {
      const payload = {
        id: 'user-123',
        email: 'test@example.com',
      };

      const mockToken = 'mock-jwt-token';
      mockJwtSign.mockReturnValue(mockToken);

      const result = generateToken(payload);

      expect(result).toBe(mockToken);
      expect(mockJwtSign).toHaveBeenCalledWith(
        payload,
        'test-secret-key',
        {
          expiresIn: '7d',
        }
      );
    });

    it('should use config jwt secret and expiresIn', () => {
      const payload = {
        id: 'user-456',
        email: 'another@example.com',
      };

      const mockToken = 'another-mock-token';
      mockJwtSign.mockReturnValue(mockToken);

      generateToken(payload);

      expect(mockJwtSign).toHaveBeenCalledWith(
        payload,
        'test-secret-key',
        {
          expiresIn: '7d',
        }
      );
    });

    it('should handle different payload values', () => {
      const payload1 = {
        id: 'user-1',
        email: 'user1@example.com',
      };

      const payload2 = {
        id: 'user-2',
        email: 'user2@example.com',
      };

      mockJwtSign
        .mockReturnValueOnce('token-1')
        .mockReturnValueOnce('token-2');

      const result1 = generateToken(payload1);
      const result2 = generateToken(payload2);

      expect(result1).toBe('token-1');
      expect(result2).toBe('token-2');
      expect(mockJwtSign).toHaveBeenCalledTimes(2);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid JWT token and return payload', () => {
      const mockPayload = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockJwtVerify.mockReturnValue(mockPayload);

      const result = verifyToken('valid-token');

      expect(result).toEqual(mockPayload);
      expect(mockJwtVerify).toHaveBeenCalledWith('valid-token', 'test-secret-key');
    });

    it('should throw error for invalid token', () => {
      const error = new Error('Invalid token');
      mockJwtVerify.mockImplementation(() => {
        throw error;
      });

      expect(() => verifyToken('invalid-token')).toThrow('Invalid token');
      expect(mockJwtVerify).toHaveBeenCalledWith('invalid-token', 'test-secret-key');
    });

    it('should throw error for expired token', () => {
      const expiredError = new Error('jwt expired');
      expiredError.name = 'TokenExpiredError';
      mockJwtVerify.mockImplementation(() => {
        throw expiredError;
      });

      expect(() => verifyToken('expired-token')).toThrow('jwt expired');
      expect(mockJwtVerify).toHaveBeenCalledWith('expired-token', 'test-secret-key');
    });

    it('should throw error for token with wrong secret', () => {
      const secretError = new Error('invalid signature');
      secretError.name = 'JsonWebTokenError';
      mockJwtVerify.mockImplementation(() => {
        throw secretError;
      });

      expect(() => verifyToken('wrong-secret-token')).toThrow('invalid signature');
      expect(mockJwtVerify).toHaveBeenCalledWith('wrong-secret-token', 'test-secret-key');
    });

    it('should return payload with correct structure', () => {
      const mockPayload = {
        id: 'user-789',
        email: 'user789@example.com',
        // jwt.verify might return additional properties, but we cast to our type
        iat: 1234567890,
        exp: 1234567890,
      };

      mockJwtVerify.mockReturnValue(mockPayload);

      const result = verifyToken('some-token');

      expect(result.id).toBe('user-789');
      expect(result.email).toBe('user789@example.com');
      // Type assertion ensures we only get id and email in the return type
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email');
    });

    it('should use config jwt secret for verification', () => {
      const mockPayload = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockJwtVerify.mockReturnValue(mockPayload);

      verifyToken('test-token');

      expect(mockJwtVerify).toHaveBeenCalledWith('test-token', 'test-secret-key');
    });

    it('should handle empty token string', () => {
      const error = new Error('jwt malformed');
      error.name = 'JsonWebTokenError';
      mockJwtVerify.mockImplementation(() => {
        throw error;
      });

      expect(() => verifyToken('')).toThrow('jwt malformed');
    });
  });
});

