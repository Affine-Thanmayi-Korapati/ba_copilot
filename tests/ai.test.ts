import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create a mock for generateContent
const mockGenerateContent = vi.fn();

// Mock the @google/genai SDK module
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(function (this: any) {
      return {
        models: {
          generateContent: mockGenerateContent,
        },
      };
    }),
    Type: {
      OBJECT: 'OBJECT',
      STRING: 'STRING',
      ARRAY: 'ARRAY',
    },
  };
});

describe('AI Service Layer Unit Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };

    // Mock console methods to avoid polluting test logs
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock setTimeout so tests with retries complete instantly
    vi.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
      cb();
      return {} as any;
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('getGeminiClient', () => {
    it('should throw an error if GEMINI_API_KEY environment variable is missing', async () => {
      delete process.env.GEMINI_API_KEY;

      const { getGeminiClient } = await import('../server/services/ai');

      expect(() => getGeminiClient()).toThrow(
        'GEMINI_API_KEY environment variable is required but missing.'
      );
    });

    it('should successfully initialize and return the client when GEMINI_API_KEY is present', async () => {
      process.env.GEMINI_API_KEY = 'test_api_key_123';

      const { getGeminiClient } = await import('../server/services/ai');
      const client = getGeminiClient();

      expect(client).toBeDefined();
      expect(client.models).toBeDefined();
    });
  });

  describe('analyzeMeetingNotes', () => {
    const mockNotes = 'We need a login page and responsive dashboard.';
    const validBAAnalysisResponse = {
      executiveSummary: 'This is a mock executive summary of notes.',
      functionalRequirements: ['The system shall support secure user login.', 'The system shall have responsive layouts.'],
      userStories: [
        {
          title: 'Secure login',
          story: 'As a user, I want to log in securely so that my data is safe.',
          acceptanceCriteria: ['Given secure input fields when submitting then log in.'],
        }
      ],
      risks: ['Authentication bypass risks.'],
      assumptions: ['Database is PostgreSQL.'],
      clarifyingQuestions: ['Should we support multi-factor auth?'],
    };

    it('should successfully analyze meeting notes and return parsed JSON on first attempt', async () => {
      process.env.GEMINI_API_KEY = 'test_api_key_123';
      
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(validBAAnalysisResponse),
      });

      const { analyzeMeetingNotes } = await import('../server/services/ai');
      const result = await analyzeMeetingNotes(mockNotes);

      expect(result).toEqual(validBAAnalysisResponse);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-3.5-flash',
          contents: expect.stringContaining(mockNotes),
        })
      );
    });

    it('should retry on transient failure and succeed if subsequent attempt works', async () => {
      process.env.GEMINI_API_KEY = 'test_api_key_123';

      // First attempt throws error, second succeeds
      mockGenerateContent
        .mockRejectedValueOnce(new Error('Transient Rate Limit Error'))
        .mockResolvedValueOnce({
          text: JSON.stringify(validBAAnalysisResponse),
        });

      const { analyzeMeetingNotes } = await import('../server/services/ai');
      const result = await analyzeMeetingNotes(mockNotes);

      expect(result).toEqual(validBAAnalysisResponse);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it('should fall back to next model if the first model fails all retries', async () => {
      process.env.GEMINI_API_KEY = 'test_api_key_123';

      // first model (gemini-3.5-flash) fails 3 times
      // second model (gemini-3.1-flash-lite) succeeds on its first attempt
      mockGenerateContent
        .mockRejectedValueOnce(new Error('Internal Overload'))
        .mockRejectedValueOnce(new Error('Internal Overload'))
        .mockRejectedValueOnce(new Error('Internal Overload'))
        .mockResolvedValueOnce({
          text: JSON.stringify(validBAAnalysisResponse),
        });

      const { analyzeMeetingNotes } = await import('../server/services/ai');
      const result = await analyzeMeetingNotes(mockNotes);

      expect(result).toEqual(validBAAnalysisResponse);
      expect(mockGenerateContent).toHaveBeenCalledTimes(4);
      
      // Verify first 3 calls used 'gemini-3.5-flash'
      expect(mockGenerateContent.mock.calls[0][0].model).toBe('gemini-3.5-flash');
      expect(mockGenerateContent.mock.calls[1][0].model).toBe('gemini-3.5-flash');
      expect(mockGenerateContent.mock.calls[2][0].model).toBe('gemini-3.5-flash');
      
      // Verify 4th call used fallback 'gemini-3.1-flash-lite'
      expect(mockGenerateContent.mock.calls[3][0].model).toBe('gemini-3.1-flash-lite');
    });

    it('should fail immediately and not retry if there is an API key error', async () => {
      process.env.GEMINI_API_KEY = 'test_api_key_123';

      mockGenerateContent.mockRejectedValue(new Error('API key is invalid'));

      const { analyzeMeetingNotes } = await import('../server/services/ai');

      await expect(analyzeMeetingNotes(mockNotes)).rejects.toThrow('API key is invalid');
      // No retries, so generateContent is called only once
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if all models and all retries fail', async () => {
      process.env.GEMINI_API_KEY = 'test_api_key_123';

      mockGenerateContent.mockRejectedValue(new Error('Service Unavailable'));

      const { analyzeMeetingNotes } = await import('../server/services/ai');

      await expect(analyzeMeetingNotes(mockNotes)).rejects.toThrow(
        'Failed to analyze meeting notes with AI. Details: Service Unavailable'
      );
      // Tried 3 times for gemini-3.5-flash, and 3 times for gemini-3.1-flash-lite = 6 times total
      expect(mockGenerateContent).toHaveBeenCalledTimes(6);
    });

    it('should throw an error if the AI response text is not valid JSON', async () => {
      process.env.GEMINI_API_KEY = 'test_api_key_123';

      mockGenerateContent.mockResolvedValue({
        text: 'Invalid plain text instead of JSON schema',
      });

      const { analyzeMeetingNotes } = await import('../server/services/ai');

      await expect(analyzeMeetingNotes(mockNotes)).rejects.toThrow(
        'Failed to parse the structured analysis document generated by the AI.'
      );
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });
  });
});
