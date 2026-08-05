import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TerminalShortener from '../components/TerminalShortener';

// Mock the API fetch
vi.mock('../lib/api', () => ({
  apiUrl: (path: string) => path,
  fetchApi: vi.fn(),
}));

import { fetchApi } from '../lib/api';

describe('TerminalShortener History State', () => {
  beforeEach(() => {
    localStorage.setItem('userEmail', 'test@test.com');
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should correctly accumulate history items using functional state update', async () => {
    const mockFetchApi = fetchApi as unknown as ReturnType<typeof vi.fn>;
    
    // Setup mock responses for two different URLs
    mockFetchApi.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        longUrl: 'https://example1.com',
        shortCode: 'abc1',
        shortUrl: 'https://shur.click/abc1',
        masked: false
      })
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        longUrl: 'https://example2.com',
        shortCode: 'abc2',
        shortUrl: 'https://shur.click/abc2',
        masked: false
      })
    });

    render(
      <MemoryRouter>
        <TerminalShortener />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText('Paste your long URL');
    const button = screen.getByRole('button', { name: /shorten/i });

    // Fire first submit
    fireEvent.change(input, { target: { value: 'https://example1.com' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('https://shur.click/abc1')).toBeInTheDocument();
    });

    // Fire second submit
    fireEvent.change(input, { target: { value: 'https://example2.com' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getAllByText('https://shur.click/abc2').length).toBeGreaterThan(0);
    });

    // Verify both items are in the history
    const historyButton = screen.getByRole('button', { name: /history \(2\)/i });
    fireEvent.click(historyButton);

    expect(screen.getAllByText('https://shur.click/abc1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('https://shur.click/abc2').length).toBeGreaterThan(0);
  });
});
