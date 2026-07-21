import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSessions, createSession } from '../server/controllers/sessions';
import { prisma } from '../server/services/db';

vi.mock('../server/services/db', () => ({
  prisma: {
    analysisSession: {
      findMany: vi.fn(),
      create: vi.fn()
    }
  }
}));

describe('Sessions CRUD Tests', () => {
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
  });

  describe('GET /api/sessions - list user sessions', () => {
    it('should return all sessions belonging to the user sorted by date descending', async () => {
      mockReq = {
        user: { id: 'user_123', email: 'jane@company.com' }
      };

      const mockSessions = [
        {
          id: 'session_2',
          userId: 'user_123',
          title: 'Second Session',
          meetingNotes: 'Newer notes here',
          createdAt: new Date('2026-07-20T02:00:00.000Z'),
          updatedAt: new Date('2026-07-20T02:00:00.000Z')
        },
        {
          id: 'session_1',
          userId: 'user_123',
          title: 'First Session',
          meetingNotes: 'Some notes here',
          createdAt: new Date('2026-07-20T01:00:00.000Z'),
          updatedAt: new Date('2026-07-20T01:00:00.000Z')
        }
      ];

      (prisma.analysisSession.findMany as any).mockResolvedValue(mockSessions);

      await getSessions(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      const returnedData = mockRes.json.mock.calls[0][0];
      expect(returnedData.length).toBe(2);
      expect(returnedData[0].id).toBe('session_2');
    });
  });

  describe('POST /api/sessions - create session', () => {
    it('should successfully save a new session to the database', async () => {
      mockReq = {
        user: { id: 'user_123' },
        body: {
          title: 'Design Sprint Minutes',
          meetingNotes: 'Team decided to build a slate theme.'
        }
      };

      (prisma.analysisSession.create as any).mockResolvedValue({
        id: 'new_session_uuid',
        userId: 'user_123',
        title: 'Design Sprint Minutes',
        meetingNotes: 'Team decided to build a slate theme.',
        createdAt: new Date('2026-07-20T00:00:00.000Z'),
        updatedAt: new Date('2026-07-20T00:00:00.000Z')
      });

      await createSession(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'new_session_uuid',
          userId: 'user_123',
          title: 'Design Sprint Minutes'
        })
      );
    });
  });
});
