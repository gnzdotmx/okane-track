import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../Login';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Mock the AuthContext
const mockLogin = vi.fn();
const mockRegister = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

const mockUseAuth = useAuth as ReturnType<typeof vi.fn>;
const mockUseNavigate = useNavigate as ReturnType<typeof vi.fn>;

// Helper to render component with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      register: mockRegister,
    });
    mockUseNavigate.mockReturnValue(mockNavigate);
  });

  describe('Rendering', () => {
    it('should render login form by default', () => {
      renderWithRouter(<Login />);

      expect(screen.getByText('💰 OkaneTrack')).toBeInTheDocument();
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
    });

    it('should not show first name and last name fields in login mode', () => {
      renderWithRouter(<Login />);

      expect(screen.queryByRole('textbox', { name: /first name/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: /last name/i })).not.toBeInTheDocument();
    });

    it('should show register form when toggled', () => {
      renderWithRouter(<Login />);

      const toggleLink = screen.getByRole('button', { name: /sign up/i });
      fireEvent.click(toggleLink);

      expect(screen.getByText('Create a new account')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /first name/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /last name/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
      expect(screen.getByText('Already have an account?')).toBeInTheDocument();
    });

    it('should toggle back to login form', () => {
      renderWithRouter(<Login />);

      // Switch to register
      const signUpLink = screen.getByRole('button', { name: /sign up/i });
      fireEvent.click(signUpLink);

      // Switch back to login
      const signInLink = screen.getByRole('button', { name: /sign in/i });
      fireEvent.click(signInLink);

      expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: /first name/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: /last name/i })).not.toBeInTheDocument();
    });
  });

  describe('Form Input', () => {
    it('should update email field', () => {
      renderWithRouter(<Login />);

      const emailInput = screen.getByRole('textbox', { name: /email/i }) as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      expect(emailInput.value).toBe('test@example.com');
    });

    it('should update password field', () => {
      renderWithRouter(<Login />);

      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      expect(passwordInput.value).toBe('password123');
    });

    it('should update first name and last name in register mode', () => {
      renderWithRouter(<Login />);

      // Switch to register mode
      const toggleLink = screen.getByRole('button', { name: /sign up/i });
      fireEvent.click(toggleLink);

      const firstNameInput = screen.getByRole('textbox', { name: /first name/i }) as HTMLInputElement;
      const lastNameInput = screen.getByRole('textbox', { name: /last name/i }) as HTMLInputElement;

      fireEvent.change(firstNameInput, { target: { value: 'John' } });
      fireEvent.change(lastNameInput, { target: { value: 'Doe' } });

      expect(firstNameInput.value).toBe('John');
      expect(lastNameInput.value).toBe('Doe');
    });
  });

  describe('Form Submission - Login', () => {
    it('should call login and navigate on successful login', async () => {
      mockLogin.mockResolvedValue(undefined);

      renderWithRouter(<Login />);

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should show error message on login failure', async () => {
      const error = {
        response: {
          data: {
            message: 'Invalid credentials',
          },
        },
      };
      mockLogin.mockRejectedValue(error);

      renderWithRouter(<Login />);

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should show generic error message when error has no response', async () => {
      mockLogin.mockRejectedValue(new Error('Network error'));

      renderWithRouter(<Login />);

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Authentication failed')).toBeInTheDocument();
      });
    });

    it('should disable submit button while loading', async () => {
      let resolveLogin: () => void;
      const loginPromise = new Promise<void>((resolve) => {
        resolveLogin = resolve;
      });
      mockLogin.mockReturnValue(loginPromise);

      renderWithRouter(<Login />);

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Please wait...')).toBeInTheDocument();

      await act(async () => {
        resolveLogin!();
        await loginPromise;
      });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Form Submission - Register', () => {
    it('should call register and navigate on successful registration', async () => {
      mockRegister.mockResolvedValue(undefined);

      renderWithRouter(<Login />);

      // Switch to register mode
      const toggleLink = screen.getByRole('button', { name: /sign up/i });
      fireEvent.click(toggleLink);

      const firstNameInput = screen.getByRole('textbox', { name: /first name/i });
      const lastNameInput = screen.getByRole('textbox', { name: /last name/i });
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(firstNameInput, { target: { value: 'John' } });
      fireEvent.change(lastNameInput, { target: { value: 'Doe' } });
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          email: 'john@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
        });
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should show error message on registration failure', async () => {
      const error = {
        response: {
          data: {
            message: 'Email already exists',
          },
        },
      };
      mockRegister.mockRejectedValue(error);

      renderWithRouter(<Login />);

      // Switch to register mode
      const toggleLink = screen.getByRole('button', { name: /sign up/i });
      fireEvent.click(toggleLink);

      const firstNameInput = screen.getByRole('textbox', { name: /first name/i });
      const lastNameInput = screen.getByRole('textbox', { name: /last name/i });
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(firstNameInput, { target: { value: 'John' } });
      fireEvent.change(lastNameInput, { target: { value: 'Doe' } });
      fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Email already exists')).toBeInTheDocument();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should clear error when toggling between login and register', async () => {
      mockLogin.mockRejectedValue({
        response: {
          data: {
            message: 'Invalid credentials',
          },
        },
      });

      renderWithRouter(<Login />);

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });

      // Toggle to register mode
      const toggleLink = screen.getByRole('button', { name: /sign up/i });
      fireEvent.click(toggleLink);

      // Error should be cleared
      expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument();
    });

    it('should not show error alert initially', () => {
      renderWithRouter(<Login />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should have required fields in login form', () => {
      renderWithRouter(<Login />);

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('required');
    });

    it('should have required fields in register form', () => {
      renderWithRouter(<Login />);

      // Switch to register mode
      const toggleLink = screen.getByRole('button', { name: /sign up/i });
      fireEvent.click(toggleLink);

      const firstNameInput = screen.getByRole('textbox', { name: /first name/i });
      const lastNameInput = screen.getByRole('textbox', { name: /last name/i });
      const emailInput = screen.getByRole('textbox', { name: /email/i });
      const passwordInput = screen.getByLabelText(/password/i);

      expect(firstNameInput).toHaveAttribute('required');
      expect(lastNameInput).toHaveAttribute('required');
      expect(emailInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('required');
    });

    it('should have email type for email input', () => {
      renderWithRouter(<Login />);

      const emailInput = screen.getByRole('textbox', { name: /email/i });
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should have password type for password input', () => {
      renderWithRouter(<Login />);

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });
});

