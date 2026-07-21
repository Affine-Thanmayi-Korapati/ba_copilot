import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { register, login } from '../server/controllers/auth';
import { prisma } from '../server/services/db';

// Mock Prisma database references
vi.mock('../server/services/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn()
    }
  }
}));

// Mock bcrypt and jsonwebtoken
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
    verify: vi.fn()
  }
}));

describe('Auth Controller Tests', () => {
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
  });

  describe('POST /api/auth/register', () => {
    it('should successfully register a new user and return a JWT', async () => {
      mockReq = {
        body: {
          name: 'Jane Doe',
          email: 'jane@company.com',
          password: 'securePassword123'
        }
      };

      // Mock user check (null = doesn't exist)
      (prisma.user.findUnique as any).mockResolvedValue(null);
      // Mock user creation
      (prisma.user.create as any).mockResolvedValue({
        id: 'new_user_uuid',
        name: 'Jane Doe',
        email: 'jane@company.com',
        createdAt: new Date('2026-07-20T00:00:00.000Z')
      });

      await register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Registration successful',
          token: 'mocked_jwt_token',
          user: expect.objectContaining({
            name: 'Jane Doe',
            email: 'jane@company.com'
          })
        })
      );
    });

    it('should fail registration if email is already taken', async () => {
      mockReq = {
        body: {
          name: 'Jane Doe',
          email: 'duplicate@company.com',
          password: 'password123'
        }
      };

      // Mock user check (returns user record = user exists)
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user_123',
        name: 'Jane Doe',
        email: 'duplicate@company.com'
      });

      await register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'User with this email already exists'
        })
      );
    });
  });

  describe('POST /api/auth/login', () => {
    it('should successfully login and return a token for valid credentials', async () => {
      mockReq = {
        body: {
          email: 'jane@company.com',
          password: 'securePassword123'
        }
      };

      // Mock existing user in database
      const mockUser = {
        id: 'user_123',
        name: 'Jane Doe',
        email: 'jane@company.com',
        passwordHash: 'hashed_password_abc',
        createdAt: new Date('2026-07-20T00:00:00.000Z')
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      // Mock password comparison match
      (bcrypt.compare as any).mockResolvedValue(true);

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Login successful',
          token: 'mocked_jwt_token',
          user: expect.objectContaining({
            id: 'user_123',
            name: 'Jane Doe'
          })
        })
      );
    });
  });
});
