import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { hashPassword, verifyPassword, generateToken } from '../utils/security';
import { recordAuditLog } from '../utils/audit';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { AuthenticatedRequest } from '../types';
import { config } from '../config';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  fullName: z.string().min(2, 'Full name is required').trim(),
  companyName: z.string().min(2, 'Company name is required').trim().optional(),
  companySlug: z.string().min(2).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .optional(),
});

// Helper to set auth cookie
function setAuthCookie(res: Response, token: string) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });
}

/**
 * POST /api/auth/register
 */
router.post('/register', validateRequest({ body: registerSchema }), async (req, res): Promise<void> => {
  try {
    const { email, password, fullName, companyName, companySlug } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ error: 'An account with this email already exists', code: 'EMAIL_EXISTS' });
      return;
    }

    const passwordHash = await hashPassword(password);

    // Atomically create user and company / membership in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          fullName,
        },
      });

      let company;
      let role = 'ADMIN';

      if (companySlug) {
        company = await tx.company.findUnique({ where: { slug: companySlug } });
        if (!company) {
          throw new Error('Target company workspace not found');
        }
        role = 'MEMBER';
      } else {
        const slug = (companyName || `${fullName.split(' ')[0]}'s Workspace`)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') + `-${Math.floor(1000 + Math.random() * 9000)}`;

        company = await tx.company.create({
          data: {
            name: companyName || `${fullName}'s Workspace`,
            slug,
          },
        });
      }

      await tx.membership.create({
        data: {
          userId: user.id,
          companyId: company.id,
          role,
          status: 'ACTIVE',
        },
      });

      return { user, company, role };
    });

    const token = generateToken({
      id: result.user.id,
      email: result.user.email,
      fullName: result.user.fullName,
    });

    setAuthCookie(res, token);

    await recordAuditLog({
      companyId: result.company.id,
      actorId: result.user.id,
      action: 'AUTH_REGISTER',
      outcome: 'SUCCESS',
      metadata: { email: result.user.email, companyName: result.company.name, role: result.role },
      req,
    });

    res.status(201).json({
      message: 'Account successfully registered',
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
      },
      activeCompany: {
        id: result.company.id,
        name: result.company.name,
        slug: result.company.slug,
        role: result.role,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message || 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', validateRequest({ body: loginSchema }), async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: { company: true },
        },
      },
    });

    if (!user) {
      // Record failed login audit event with dummy company if not known
      res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
      return;
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      if (user.memberships.length > 0) {
        await recordAuditLog({
          companyId: user.memberships[0].companyId,
          actorId: user.id,
          action: 'AUTH_LOGIN_FAILED',
          outcome: 'DENIED',
          metadata: { email, reason: 'Incorrect password' },
          req,
        });
      }

      res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
      return;
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
    });

    setAuthCookie(res, token);

    const primaryMembership = user.memberships[0];
    if (primaryMembership) {
      await recordAuditLog({
        companyId: primaryMembership.companyId,
        actorId: user.id,
        action: 'AUTH_LOGIN_SUCCESS',
        outcome: 'SUCCESS',
        metadata: { email: user.email },
        req,
      });
    }

    res.json({
      message: 'Sign in successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
      },
      memberships: user.memberships.map((m) => ({
        companyId: m.companyId,
        companyName: m.company.name,
        companySlug: m.company.slug,
        role: m.role,
        status: m.status,
      })),
      activeCompany: primaryMembership
        ? {
            id: primaryMembership.companyId,
            name: primaryMembership.company.name,
            slug: primaryMembership.company.slug,
            role: primaryMembership.role,
          }
        : null,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'An error occurred during authentication' });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    if (req.user) {
      const membership = await prisma.membership.findFirst({
        where: { userId: req.user.id },
      });
      if (membership) {
        await recordAuditLog({
          companyId: membership.companyId,
          actorId: req.user.id,
          action: 'AUTH_LOGOUT',
          outcome: 'SUCCESS',
          req,
        });
      }
    }

    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        createdAt: true,
        memberships: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      memberships: user.memberships.map((m) => ({
        companyId: m.companyId,
        companyName: m.company.name,
        companySlug: m.company.slug,
        role: m.role,
        status: m.status,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

/**
 * PUT /api/auth/profile
 */
router.put(
  '/profile',
  requireAuth,
  validateRequest({ body: updateProfileSchema }),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const { fullName, currentPassword, newPassword } = req.body;
      const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const updateData: any = {};
      if (fullName) updateData.fullName = fullName;

      if (newPassword) {
        if (!currentPassword) {
          res.status(400).json({ error: 'Current password is required to set a new password' });
          return;
        }

        const isMatch = await verifyPassword(currentPassword, user.passwordHash);
        if (!isMatch) {
          res.status(400).json({ error: 'Current password is incorrect' });
          return;
        }

        updateData.passwordHash = await hashPassword(newPassword);
      }

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
        select: { id: true, email: true, fullName: true, avatarUrl: true },
      });

      res.json({ message: 'Profile updated successfully', user: updated });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

export default router;
