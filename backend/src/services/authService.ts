import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { config } from '../config/env.js';
import { JwtPayload, LoginResponse, MeResponse } from '../types/index.js';

const SALT_ROUNDS = 10;

export class AuthService {
  async login(email: string, password: string): Promise<LoginResponse | null> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return null;
    }

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role.toLowerCase() as 'viewer' | 'editor',
    };

    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as string,
    } as jwt.SignOptions);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role.toLowerCase() as 'viewer' | 'editor',
      },
    };
  }

  async getMe(userId: string): Promise<MeResponse | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role.toLowerCase() as 'viewer' | 'editor',
    };
  }

  async createUser(email: string, password: string, role: 'VIEWER' | 'EDITOR'): Promise<void> {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
      },
    });
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }
}

export const authService = new AuthService();
