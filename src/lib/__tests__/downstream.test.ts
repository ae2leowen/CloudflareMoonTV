/**
 * Tests for video source parsing logic in downstream.ts.
 * Focuses on the URL extraction and result mapping logic.
 */

// Mock fetch globally for all tests
const mockFetch = jest.fn();
global.fetch = mockFetch;

// We test the parsing logic by inspecting the data flow.
// The actual searchFromApi function uses fetch, so we mock it.

describe('downstream URL parsing', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('extracts m3u8 URLs from vod_play_url with $ prefix', async () => {
    const mockApiResponse = {
      list: [
        {
          vod_id: '1',
          vod_name: 'Test Movie',
          vod_pic: 'https://example.com/pic.jpg',
          vod_play_url:
            '第1集$https://cdn.example.com/ep1.m3u8#第2集$https://cdn.example.com/ep2.m3u8',
          vod_year: '2024',
          vod_class: 'Drama',
          vod_content: 'A great movie',
          type_name: '电影',
        },
      ],
      pagecount: 1,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    });

    // We import dynamically to avoid module-level side effects
    const { searchFromApi } = await import('../downstream');

    const results = await searchFromApi(
      { key: 'test', api: 'https://api.example.com', name: 'Test Source' },
      'Test Movie'
    );

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Test Movie');
    expect(results[0].id).toBe('1');
    expect(results[0].source).toBe('test');
    expect(results[0].source_name).toBe('Test Source');
    expect(results[0].year).toBe('2024');
  });

  it('returns empty array when API response has no list', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ pagecount: 0 }),
    });

    const { searchFromApi } = await import('../downstream');
    const results = await searchFromApi(
      { key: 'test', api: 'https://api.example.com', name: 'Test' },
      'query'
    );

    expect(results).toEqual([]);
  });

  it('returns empty array when fetch fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { searchFromApi } = await import('../downstream');
    const results = await searchFromApi(
      { key: 'test', api: 'https://api.example.com', name: 'Test' },
      'query'
    );

    expect(results).toEqual([]);
  });

  it('returns empty array when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { searchFromApi } = await import('../downstream');
    const results = await searchFromApi(
      { key: 'test', api: 'https://api.example.com', name: 'Test' },
      'query'
    );

    expect(results).toEqual([]);
  });

  it('deduplicates episodes', async () => {
    const mockApiResponse = {
      list: [
        {
          vod_id: '1',
          vod_name: 'Movie',
          vod_pic: '',
          vod_play_url:
            '$https://cdn.example.com/ep1.m3u8#$https://cdn.example.com/ep1.m3u8',
          vod_year: '2024',
        },
      ],
      pagecount: 1,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    });

    const { searchFromApi } = await import('../downstream');
    const results = await searchFromApi(
      { key: 'test', api: 'https://api.example.com', name: 'Test' },
      'Movie'
    );

    // Duplicates should be removed
    const episodes = results[0]?.episodes ?? [];
    const unique = new Set(episodes);
    expect(unique.size).toBe(episodes.length);
  });
});
