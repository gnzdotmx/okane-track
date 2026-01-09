// Mock dependencies
const mockBcryptHash = jest.fn();
const mockBcryptCompare = jest.fn();

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    hash: mockBcryptHash,
    compare: mockBcryptCompare,
  },
}));

import { hashPassword, comparePassword } from '../password';

describe('password utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash a password using bcrypt', async () => {
      const password = 'mySecurePassword123';
      const hashedPassword = '$2a$12$hashedpasswordstring';

      mockBcryptHash.mockResolvedValue(hashedPassword);

      const result = await hashPassword(password);

      expect(result).toBe(hashedPassword);
      expect(mockBcryptHash).toHaveBeenCalledWith(password, 12);
    });

    it('should use SALT_ROUNDS constant (12)', async () => {
      const password = 'testPassword';
      const hashedPassword = '$2a$12$hashed';

      mockBcryptHash.mockResolvedValue(hashedPassword);

      await hashPassword(password);

      expect(mockBcryptHash).toHaveBeenCalledWith(password, 12);
      expect(mockBcryptHash).toHaveBeenCalledTimes(1);
    });

    it('should hash different passwords to different hashes', async () => {
      const password1 = 'password1';
      const password2 = 'password2';
      const hash1 = '$2a$12$hash1';
      const hash2 = '$2a$12$hash2';

      mockBcryptHash
        .mockResolvedValueOnce(hash1)
        .mockResolvedValueOnce(hash2);

      const result1 = await hashPassword(password1);
      const result2 = await hashPassword(password2);

      expect(result1).toBe(hash1);
      expect(result2).toBe(hash2);
      expect(mockBcryptHash).toHaveBeenCalledTimes(2);
    });

    it('should handle empty password', async () => {
      const password = '';
      const hashedPassword = '$2a$12$emptyhash';

      mockBcryptHash.mockResolvedValue(hashedPassword);

      const result = await hashPassword(password);

      expect(result).toBe(hashedPassword);
      expect(mockBcryptHash).toHaveBeenCalledWith('', 12);
    });

    it('should handle special characters in password', async () => {
      const password = 'p@ssw0rd!#$%^&*()';
      const hashedPassword = '$2a$12$specialhash';

      mockBcryptHash.mockResolvedValue(hashedPassword);

      const result = await hashPassword(password);

      expect(result).toBe(hashedPassword);
      expect(mockBcryptHash).toHaveBeenCalledWith(password, 12);
    });

    it('should handle long passwords', async () => {
      const password = 'a'.repeat(1000);
      const hashedPassword = '$2a$12$longhash';

      mockBcryptHash.mockResolvedValue(hashedPassword);

      const result = await hashPassword(password);

      expect(result).toBe(hashedPassword);
      expect(mockBcryptHash).toHaveBeenCalledWith(password, 12);
    });
  });

  describe('comparePassword', () => {
    it('should return true when password matches hash', async () => {
      const password = 'mySecurePassword123';
      const hashedPassword = '$2a$12$hashedpasswordstring';

      mockBcryptCompare.mockResolvedValue(true);

      const result = await comparePassword(password, hashedPassword);

      expect(result).toBe(true);
      expect(mockBcryptCompare).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('should return false when password does not match hash', async () => {
      const password = 'wrongPassword';
      const hashedPassword = '$2a$12$hashedpasswordstring';

      mockBcryptCompare.mockResolvedValue(false);

      const result = await comparePassword(password, hashedPassword);

      expect(result).toBe(false);
      expect(mockBcryptCompare).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('should compare password with correct hash format', async () => {
      const password = 'testPassword';
      const hashedPassword = '$2a$12$correcthashformat';

      mockBcryptCompare.mockResolvedValue(true);

      await comparePassword(password, hashedPassword);

      expect(mockBcryptCompare).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('should handle empty password comparison', async () => {
      const password = '';
      const hashedPassword = '$2a$12$emptyhash';

      mockBcryptCompare.mockResolvedValue(false);

      const result = await comparePassword(password, hashedPassword);

      expect(result).toBe(false);
      expect(mockBcryptCompare).toHaveBeenCalledWith('', hashedPassword);
    });

    it('should handle empty hash comparison', async () => {
      const password = 'somePassword';
      const hashedPassword = '';

      mockBcryptCompare.mockResolvedValue(false);

      const result = await comparePassword(password, hashedPassword);

      expect(result).toBe(false);
      expect(mockBcryptCompare).toHaveBeenCalledWith(password, '');
    });

    it('should handle special characters in password', async () => {
      const password = 'p@ssw0rd!#$%^&*()';
      const hashedPassword = '$2a$12$specialhash';

      mockBcryptCompare.mockResolvedValue(true);

      const result = await comparePassword(password, hashedPassword);

      expect(result).toBe(true);
      expect(mockBcryptCompare).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('should handle case-sensitive password comparison', async () => {
      const password1 = 'Password123';
      const password2 = 'password123';
      const hashedPassword = '$2a$12$hash';

      mockBcryptCompare
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result1 = await comparePassword(password1, hashedPassword);
      const result2 = await comparePassword(password2, hashedPassword);

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });

    it('should handle multiple comparisons', async () => {
      const password = 'testPassword';
      const hash1 = '$2a$12$hash1';
      const hash2 = '$2a$12$hash2';

      mockBcryptCompare
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result1 = await comparePassword(password, hash1);
      const result2 = await comparePassword(password, hash2);

      expect(result1).toBe(true);
      expect(result2).toBe(false);
      expect(mockBcryptCompare).toHaveBeenCalledTimes(2);
    });
  });
});

