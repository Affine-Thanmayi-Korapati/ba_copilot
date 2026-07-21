import express from 'express';
import supertest from 'supertest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import authRoutes from '../server/routes/auth';
import sessionRoutes from '../server/routes/sessions';
import { prisma } from '../server/services/db';
import { analyzeMeetingNotes } from '../server/services/ai';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Setup Mock for Prisma DB
vi.mock('../server/services/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    analysisSession: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    aIAnalysis: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    exportRecord: {
      create: vi.fn(),
    }
  }
}));

// Setup Mock for AI analyze service
vi.mock('../server/services/ai', () => ({
  analyzeMeetingNotes: vi.fn(),
}));

// Setup Mock for bcryptjs and jsonwebtoken to have deterministic behaviors
vi.mock('bcryptjs', () => ({
  default: {
    genSalt: vi.fn().mockResolvedValue('salt123'),
    hash: vi.fn().mockResolvedValue('hashed_password_abc'),
    compare: vi.fn()
  }
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('mocked_jwt_token'),
    verify: vi.fn().mockImplementation((token) => {
      if (token === 'valid_token_123') {
        return { id: 'user_123', email: 'jane@company.com', name: 'Jane Doe' };
      }
      if (token === 'other_user_token') {
        return { id: 'user_other', email: 'other@company.com', name: 'Other User' };
      }
      throw new Error('Invalid token');
    })
  }
}));

// Create the Express Application for Integration Testing
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api', sessionRoutes);

// General fallback error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.status(500).json({ error: 'Internal Server Error' });
});

describe('Express API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should successfully register a new user and return user info with JWT', async () => {
      const payload = {
        name: 'Jane Doe',
        email: 'jane@company.com',
        password: 'securePassword123'
      };

      // Mock user uniqueness checks
      (prisma.user.findUnique as any).mockResolvedValue(null);
      // Mock user creation
      (prisma.user.create as any).mockResolvedValue({
        id: 'user_123',
        name: 'Jane Doe',
        email: 'jane@company.com',
        createdAt: new Date('2026-07-20T00:00:00.000Z')
      });

      const response = await supertest(app)
        .post('/api/auth/register')
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        message: 'Registration successful',
        token: 'mocked_jwt_token',
        user: {
          id: 'user_123',
          name: 'Jane Doe',
          email: 'jane@company.com',
          createdAt: '2026-07-20T00:00:00.000Z'
        }
      });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          name: 'Jane Doe',
          email: 'jane@company.com',
          passwordHash: 'hashed_password_abc'
        }
      });
    });

    it('should fail registration with 400 if email is already taken', async () => {
      const payload = {
        name: 'Jane Doe',
        email: 'duplicate@company.com',
        password: 'password123'
      };

      // Mock user existence check returning existing user
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user_existing',
        email: 'duplicate@company.com'
      });

      const response = await supertest(app)
        .post('/api/auth/register')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'User with this email already exists'
      });
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should fail with 400 if required fields are missing', async () => {
      const payload = {
        email: 'jane@company.com'
      };

      const response = await supertest(app)
        .post('/api/auth/register')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should successfully log in with correct credentials', async () => {
      const payload = {
        email: 'jane@company.com',
        password: 'securePassword123'
      };

      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user_123',
        name: 'Jane Doe',
        email: 'jane@company.com',
        passwordHash: 'hashed_password_abc',
        createdAt: new Date('2026-07-20T00:00:00.000Z')
      });

      // Match password hash
      (bcrypt.compare as any).mockResolvedValue(true);

      const response = await supertest(app)
        .post('/api/auth/login')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Login successful',
        token: 'mocked_jwt_token',
        user: {
          id: 'user_123',
          name: 'Jane Doe',
          email: 'jane@company.com',
          createdAt: '2026-07-20T00:00:00.000Z'
        }
      });
    });

    it('should fail log in with 401 if password does not match', async () => {
      const payload = {
        email: 'jane@company.com',
        password: 'wrongPassword'
      };

      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user_123',
        email: 'jane@company.com',
        passwordHash: 'hashed_password_abc'
      });

      // Passwords do not match
      (bcrypt.compare as any).mockResolvedValue(false);

      const response = await supertest(app)
        .post('/api/auth/login')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Invalid email or password'
      });
    });

    it('should fail log in with 401 if user is not found', async () => {
      const payload = {
        email: 'missing@company.com',
        password: 'anyPassword'
      };

      (prisma.user.findUnique as any).mockResolvedValue(null);

      const response = await supertest(app)
        .post('/api/auth/login')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Invalid email or password'
      });
    });
  });

  describe('JWT Authentication Middleware Protection', () => {
    it('should reject requests with 401 if Authorization header is missing', async () => {
      const response = await supertest(app)
        .get('/api/sessions');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Access token is missing'
      });
    });

    it('should reject requests with 401 if header format is not Bearer', async () => {
      const response = await supertest(app)
        .get('/api/sessions')
        .set('Authorization', 'Basic standardCredentialsToken');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('format is invalid');
    });

    it('should reject requests with 403 if token is invalid or expired', async () => {
      const response = await supertest(app)
        .get('/api/sessions')
        .set('Authorization', 'Bearer invalid_signature_token');

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: 'Token is invalid or expired'
      });
    });
  });

  describe('GET /api/sessions', () => {
    it('should retrieve list of sessions for authenticated user', async () => {
      const mockSessionsList = [
        {
          id: 'sess_1',
          userId: 'user_123',
          title: 'Session One',
          meetingNotes: 'Notes one',
          createdAt: new Date('2026-07-20T01:00:00.000Z')
        },
        {
          id: 'sess_2',
          userId: 'user_123',
          title: 'Session Two',
          meetingNotes: 'Notes two',
          createdAt: new Date('2026-07-20T02:00:00.000Z')
        }
      ];

      (prisma.analysisSession.findMany as any).mockResolvedValue(mockSessionsList);

      const response = await supertest(app)
        .get('/api/sessions')
        .set('Authorization', 'Bearer valid_token_123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].title).toBe('Session One');
      expect(prisma.analysisSession.findMany).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('POST /api/sessions', () => {
    it('should successfully create a new session', async () => {
      const payload = {
        title: 'New Integration Test Session',
        meetingNotes: 'These are the meeting notes for integration test.'
      };

      const mockSavedSession = {
        id: 'new_sess_abc',
        userId: 'user_123',
        title: 'New Integration Test Session',
        meetingNotes: 'These are the meeting notes for integration test.',
        createdAt: new Date('2026-07-20T05:00:00.000Z')
      };

      (prisma.analysisSession.create as any).mockResolvedValue(mockSavedSession);

      const response = await supertest(app)
        .post('/api/sessions')
        .set('Authorization', 'Bearer valid_token_123')
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: 'new_sess_abc',
        userId: 'user_123',
        title: 'New Integration Test Session',
        meetingNotes: 'These are the meeting notes for integration test.',
        createdAt: '2026-07-20T05:00:00.000Z'
      });
      expect(prisma.analysisSession.create).toHaveBeenCalledWith({
        data: {
          userId: 'user_123',
          title: 'New Integration Test Session',
          meetingNotes: 'These are the meeting notes for integration test.'
        }
      });
    });

    it('should fail with 400 if title is missing', async () => {
      const payload = {
        meetingNotes: 'Empty Title Notes'
      };

      const response = await supertest(app)
        .post('/api/sessions')
        .set('Authorization', 'Bearer valid_token_123')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Title and meeting notes are required'
      });
    });
  });

  describe('DELETE /api/sessions/:id', () => {
    it('should delete session if owner authenticated', async () => {
      (prisma.analysisSession.findUnique as any).mockResolvedValue({
        id: 'sess_123',
        userId: 'user_123',
        title: 'User Session'
      });

      const response = await supertest(app)
        .delete('/api/sessions/sess_123')
        .set('Authorization', 'Bearer valid_token_123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Session and related documents deleted successfully'
      });
      expect(prisma.analysisSession.delete).toHaveBeenCalledWith({
        where: { id: 'sess_123' }
      });
    });

    it('should return 404 if session does not exist', async () => {
      (prisma.analysisSession.findUnique as any).mockResolvedValue(null);

      const response = await supertest(app)
        .delete('/api/sessions/unknown_sess')
        .set('Authorization', 'Bearer valid_token_123');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: 'Session not found'
      });
    });

    it('should return 403 Forbidden if user does not own the session', async () => {
      (prisma.analysisSession.findUnique as any).mockResolvedValue({
        id: 'sess_other_user',
        userId: 'user_some_other_id',
        title: 'Other User Session'
      });

      const response = await supertest(app)
        .delete('/api/sessions/sess_other_user')
        .set('Authorization', 'Bearer valid_token_123'); // authenticated as user_123

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: 'Forbidden'
      });
      expect(prisma.analysisSession.delete).not.toHaveBeenCalled();
    });
  });
});
