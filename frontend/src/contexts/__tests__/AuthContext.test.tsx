import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../AuthContext';
import api from '../../services/api';
import { User, AuthResponse } from '../../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

// Mock the api service
vi.mock('../../services/api', () => ({
  default: {
    login: vi.fn(),
    register: vi.fn(),
    getProfile: vi.fn(),
  },
}));

const mockApi = api as unknown as {
  login: ReturnType<typeof vi.fn>;
  register: ReturnType<typeof vi.fn>;
  getProfile: ReturnType<typeof vi.fn>;
};

// Test component that uses the auth context
const TestComponent: React.FC<{ testFn: (auth: AuthContextType) => void }> = ({ testFn }) => {
  const auth = useAuth();
  React.useEffect(() => {
    testFn(auth);
  }, [auth, testFn]);
  return <div>Test Component</div>;
};

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent testFn={() => {}} />);
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleError.mockRestore();
    });

    it('should return auth context when used inside AuthProvider', async () => {
      let authContext: AuthContextType | undefined = undefined;

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent
              testFn={(auth) => {
                authContext = auth;
              }}
            />
          </AuthProvider>
        );
      });

      await waitFor(() => {
        expect(authContext).not.toBeNull();
      });

      expect(authContext).toHaveProperty('user');
      expect(authContext).toHaveProperty('token');
      expect(authContext).toHaveProperty('login');
      expect(authContext).toHaveProperty('register');
      expect(authContext).toHaveProperty('logout');
      expect(authContext).toHaveProperty('isAuthenticated');
      expect(authContext).toHaveProperty('loading');
    });
  });

  describe('AuthProvider initialization', () => {
    it('should start with loading true and no user when no token exists', async () => {
      let authContext: AuthContextType | undefined = undefined;

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent
              testFn={(auth) => {
                authContext = auth;
              }}
            />
          </AuthProvider>
        );
      });

      // Wait for initialization to complete
      await waitFor(() => {
        expect(authContext).toBeDefined();
        expect(authContext?.loading).toBe(false);
      });

      expect(authContext).toBeDefined();
      expect(authContext!.user).toBeNull();
      expect(authContext!.token).toBeNull();
      expect(authContext!.isAuthenticated).toBe(false);
    });

    it('should load user profile when valid token exists in localStorage', async () => {
      const mockUser: User = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };
      const mockToken = 'valid-token';

      localStorage.setItem('token', mockToken);
      mockApi.getProfile.mockResolvedValue({ data: mockUser });

      let authContext: AuthContextType | undefined = undefined;

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent
              testFn={(auth) => {
                authContext = auth;
              }}
            />
          </AuthProvider>
        );
      });

      await waitFor(() => {
        expect(authContext).toBeDefined();
        expect(authContext?.loading).toBe(false);
      });

      expect(mockApi.getProfile).toHaveBeenCalled();
      expect(authContext).toBeDefined();
      expect(authContext!.user).toEqual(mockUser);
      expect(authContext!.token).toBe(mockToken);
      expect(authContext!.isAuthenticated).toBe(true);
    });

    it('should clear token and user when getProfile fails', async () => {
      const mockToken = 'invalid-token';
      localStorage.setItem('token', mockToken);
      mockApi.getProfile.mockRejectedValue(new Error('Unauthorized'));

      let authContext: AuthContextType | undefined = undefined;

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent
              testFn={(auth) => {
                authContext = auth;
              }}
            />
          </AuthProvider>
        );
      });

      await waitFor(() => {
        expect(authContext).toBeDefined();
        expect(authContext?.loading).toBe(false);
      });

      expect(mockApi.getProfile).toHaveBeenCalled();
      expect(localStorage.getItem('token')).toBeNull();
      expect(authContext).toBeDefined();
      expect(authContext!.user).toBeNull();
      expect(authContext!.token).toBeNull();
      expect(authContext!.isAuthenticated).toBe(false);
    });
  });

  describe('login', () => {
    it('should login user and store token', async () => {
      const mockUser: User = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };
      const mockToken = 'new-token';
      const mockResponse: AuthResponse = {
        user: mockUser,
        token: mockToken,
      };

      mockApi.login.mockResolvedValue({ data: mockResponse });

      let authContext: AuthContextType | undefined = undefined;

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent
              testFn={(auth) => {
                authContext = auth;
              }}
            />
          </AuthProvider>
        );
      });

      await waitFor(() => {
        expect(authContext).toBeDefined();
        expect(authContext?.loading).toBe(false);
      });

      await act(async () => {
        await authContext?.login('test@example.com', 'password123');
      });

      expect(mockApi.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(localStorage.getItem('token')).toBe(mockToken);
      expect(authContext).toBeDefined();
      expect(authContext!.user).toEqual(mockUser);
      expect(authContext!.token).toBe(mockToken);
      expect(authContext!.isAuthenticated).toBe(true);
    });

    it('should handle login errors', async () => {
      const error = new Error('Invalid credentials');
      mockApi.login.mockRejectedValue(error);

      let authContext: AuthContextType | undefined = undefined;

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent
              testFn={(auth) => {
                authContext = auth;
              }}
            />
          </AuthProvider>
        );
      });

      await waitFor(() => {
        expect(authContext).toBeDefined();
        expect(authContext?.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await authContext?.login('test@example.com', 'wrong-password');
        })
      ).rejects.toThrow('Invalid credentials');

      expect(mockApi.login).toHaveBeenCalledWith('test@example.com', 'wrong-password');
      expect(localStorage.getItem('token')).toBeNull();
      expect(authContext).toBeDefined();
      expect(authContext!.user).toBeNull();
      expect(authContext!.token).toBeNull();
    });
  });

  describe('register', () => {
    it('should register user and store token', async () => {
      const mockUser: User = {
        id: 'user-1',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
      };
      const mockToken = 'new-token';
      const mockResponse: AuthResponse = {
        user: mockUser,
        token: mockToken,
      };

      const registerData = {
        email: 'new@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      };

      mockApi.register.mockResolvedValue({ data: mockResponse });

      let authContext: AuthContextType | undefined = undefined;

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent
              testFn={(auth) => {
                authContext = auth;
              }}
            />
          </AuthProvider>
        );
      });

      await waitFor(() => {
        expect(authContext).toBeDefined();
        expect(authContext?.loading).toBe(false);
      });

      await act(async () => {
        await authContext?.register(registerData);
      });

      expect(mockApi.register).toHaveBeenCalledWith(registerData);
      expect(localStorage.getItem('token')).toBe(mockToken);
      expect(authContext).toBeDefined();
      expect(authContext!.user).toEqual(mockUser);
      expect(authContext!.token).toBe(mockToken);
      expect(authContext!.isAuthenticated).toBe(true);
    });

    it('should handle register errors', async () => {
      const error = new Error('Email already exists');
      mockApi.register.mockRejectedValue(error);

      const registerData = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Existing',
        lastName: 'User',
      };

      let authContext: AuthContextType | undefined = undefined;

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent
              testFn={(auth) => {
                authContext = auth;
              }}
            />
          </AuthProvider>
        );
      });

      await waitFor(() => {
        expect(authContext).toBeDefined();
        expect(authContext?.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await authContext?.register(registerData);
        })
      ).rejects.toThrow('Email already exists');

      expect(mockApi.register).toHaveBeenCalledWith(registerData);
      expect(localStorage.getItem('token')).toBeNull();
      expect(authContext).toBeDefined();
      expect(authContext!.user).toBeNull();
    });
  });

  describe('logout', () => {
    it('should logout user and clear token', async () => {
      const mockUser: User = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };
      const mockToken = 'token';
      localStorage.setItem('token', mockToken);

      let authContext: AuthContextType | undefined = undefined;

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent
              testFn={(auth) => {
                authContext = auth;
              }}
            />
          </AuthProvider>
        );
      });

      // First login to set user
      const mockResponse: AuthResponse = {
        user: mockUser,
        token: mockToken,
      };
      mockApi.login.mockResolvedValue({ data: mockResponse });

      await waitFor(() => {
        expect(authContext?.loading).toBe(false);
      });

      await act(async () => {
        await authContext?.login('test@example.com', 'password');
      });

      expect(authContext).toBeDefined();
      expect(authContext!.isAuthenticated).toBe(true);

      // Then logout
      act(() => {
        authContext?.logout();
      });

      expect(localStorage.getItem('token')).toBeNull();
      expect(authContext).toBeDefined();
      expect(authContext!.user).toBeNull();
      expect(authContext!.token).toBeNull();
      expect(authContext!.isAuthenticated).toBe(false);
    });
  });

  describe('isAuthenticated', () => {
    it('should be false when user is null', async () => {
      let authContext: AuthContextType | undefined = undefined;

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent
              testFn={(auth) => {
                authContext = auth;
              }}
            />
          </AuthProvider>
        );
      });

      await waitFor(() => {
        expect(authContext).toBeDefined();
        expect(authContext?.loading).toBe(false);
      });

      expect(authContext).toBeDefined();
      expect(authContext!.isAuthenticated).toBe(false);
    });

    it('should be true when user exists', async () => {
      const mockUser: User = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };
      const mockToken = 'token';
      const mockResponse: AuthResponse = {
        user: mockUser,
        token: mockToken,
      };

      mockApi.login.mockResolvedValue({ data: mockResponse });

      let authContext: AuthContextType | undefined = undefined;

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent
              testFn={(auth) => {
                authContext = auth;
              }}
            />
          </AuthProvider>
        );
      });

      await waitFor(() => {
        expect(authContext?.loading).toBe(false);
      });

      await act(async () => {
        await authContext?.login('test@example.com', 'password');
      });

      expect(authContext).toBeDefined();
      expect(authContext!.isAuthenticated).toBe(true);
    });
  });

  describe('token management', () => {
    it('should initialize token from localStorage', async () => {
      const mockToken = 'stored-token';
      localStorage.setItem('token', mockToken);
      mockApi.getProfile.mockResolvedValue({ data: { id: 'user-1', email: 'test@example.com', firstName: 'Test', lastName: 'User' } });

      let authContext: AuthContextType | undefined = undefined;

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent
              testFn={(auth) => {
                authContext = auth;
              }}
            />
          </AuthProvider>
        );
      });

      // Token should be initialized from localStorage immediately
      // (before async getProfile completes)
      expect(authContext).toBeDefined();
      expect(authContext!.token).toBe(mockToken);
      
      await waitFor(() => {
        expect(authContext?.loading).toBe(false);
      });
    });

    it('should update token when login succeeds', async () => {
      const mockToken = 'new-token';
      const mockUser: User = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };
      const mockResponse: AuthResponse = {
        user: mockUser,
        token: mockToken,
      };

      mockApi.login.mockResolvedValue({ data: mockResponse });

      let authContext: AuthContextType | undefined = undefined;

      await act(async () => {
        render(
          <AuthProvider>
            <TestComponent
              testFn={(auth) => {
                authContext = auth;
              }}
            />
          </AuthProvider>
        );
      });

      await waitFor(() => {
        expect(authContext?.loading).toBe(false);
      });

      await act(async () => {
        await authContext?.login('test@example.com', 'password');
      });

      expect(authContext).toBeDefined();
      expect(authContext!.token).toBe(mockToken);
      expect(localStorage.getItem('token')).toBe(mockToken);
    });
  });
});

