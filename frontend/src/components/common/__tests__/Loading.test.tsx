import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Loading from '../Loading';

describe('Loading', () => {
  it('should render with default message', () => {
    render(<Loading />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    // CircularProgress is rendered (check for the role or testid)
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should render with custom message', () => {
    const customMessage = 'Please wait...';
    render(<Loading message={customMessage} />);

    expect(screen.getByText(customMessage)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should render CircularProgress spinner', () => {
    render(<Loading />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });

  it('should render message in Typography component', () => {
    const message = 'Fetching data...';
    render(<Loading message={message} />);

    const messageElement = screen.getByText(message);
    expect(messageElement).toBeInTheDocument();
    // Material-UI Typography with variant="h6" renders as <h6>
    expect(messageElement.tagName).toBe('H6');
  });

  it('should handle empty message', () => {
    render(<Loading message="" />);

    // Empty message still renders the Typography component, just with no text content
    // Check that the progressbar is still rendered
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    // The Typography element exists but with empty text
    // Use getAllByText since empty text might match multiple elements
    const emptyTextElements = screen.getAllByText('');
    expect(emptyTextElements.length).toBeGreaterThan(0);
    // Verify at least one is an h6 (the Typography component)
    const h6Element = emptyTextElements.find((el: HTMLElement) => el.tagName === 'H6');
    expect(h6Element).toBeDefined();
  });

  it('should handle long messages', () => {
    const longMessage = 'This is a very long loading message that might wrap to multiple lines';
    render(<Loading message={longMessage} />);

    expect(screen.getByText(longMessage)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});

