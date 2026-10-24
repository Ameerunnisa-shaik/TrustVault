import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthUser } from '../types';

const BCRYPT_SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn as any,
    }
  );
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    return {
      id: decoded.id,
      email: decoded.email,
      fullName: decoded.fullName,
      avatarUrl: decoded.avatarUrl || null,
    };
  } catch (err) {
    return null;
  }
}
