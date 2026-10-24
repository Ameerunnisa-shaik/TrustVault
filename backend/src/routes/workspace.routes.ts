import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';
import { requireTenantMembership } from '../middleware/tenant';
import { validateRequest } from '../middleware/validate';
import { AuthenticatedRequest } from '../types';
import { recordAuditLog } from '../utils/audit';

const router = Router();

const createWorkspaceSchema = z.object({
  name: z.string().min(2, 'Workspace name must be at least 2 characters').trim(),
});

const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
});

const updateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
});

/**
 * GET /api/workspaces
 * List all workspaces the user belongs to
 */
router.get('/', requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  try {
    const memberships = await prisma.membership.findMany({
      where: {
        userId: req.user!.id,
        status: 'ACTIVE',
      },
      include: {
        company: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(
      memberships.map((m) => ({
        companyId: m.companyId,
        name: m.company.name,
        slug: m.company.slug,
        role: m.role,
        createdAt: m.company.createdAt,
      }))
    );
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve workspaces' });
  }
});

/**
 * POST /api/workspaces
 * Create a new company workspace
 */
router.post(
  '/',
  requireAuth,
  validateRequest({ body: createWorkspaceSchema }),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const { name } = req.body;
      const slug =
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') + `-${Math.floor(1000 + Math.random() * 9000)}`;

      const company = await prisma.$transaction(async (tx) => {
        const comp = await tx.company.create({
          data: { name, slug },
        });

        await tx.membership.create({
          data: {
            userId: req.user!.id,
            companyId: comp.id,
            role: 'ADMIN',
            status: 'ACTIVE',
          },
        });

        return comp;
      });

      await recordAuditLog({
        companyId: company.id,
        actorId: req.user!.id,
        action: 'WORKSPACE_CREATED',
        outcome: 'SUCCESS',
        metadata: { name: company.name, slug: company.slug },
        req,
      });

      res.status(201).json({
        message: 'Workspace created successfully',
        workspace: {
          id: company.id,
          name: company.name,
          slug: company.slug,
          role: 'ADMIN',
        },
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create workspace' });
    }
  }
);

/**
 * GET /api/workspaces/:companyId
 * Get workspace details with live statistics computed from the database
 */
router.get(
  '/:companyId',
  requireAuth,
  requireTenantMembership(),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const companyId = req.tenant!.companyId;

      const [totalDocuments, totalMembers, sharedDocumentsCount, recentActivities] =
        await Promise.all([
          prisma.document.count({
            where: { companyId, isArchived: false },
          }),
          prisma.membership.count({
            where: { companyId, status: 'ACTIVE' },
          }),
          prisma.document.count({
            where: {
              companyId,
              isArchived: false,
              permissions: { some: { revokedAt: null } },
            },
          }),
          prisma.auditLog.findMany({
            where: { companyId },
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              actor: { select: { id: true, fullName: true, email: true } },
              document: { select: { id: true, name: true } },
            },
          }),
        ]);

      res.json({
        workspace: {
          id: companyId,
          name: req.tenant!.companyName,
          userRole: req.tenant!.role,
        },
        stats: {
          totalDocuments,
          totalMembers,
          sharedDocumentsCount,
        },
        recentActivities: recentActivities.map((log) => ({
          id: log.id,
          action: log.action,
          outcome: log.outcome,
          createdAt: log.createdAt,
          actor: log.actor ? { id: log.actor.id, name: log.actor.fullName, email: log.actor.email } : null,
          document: log.document ? { id: log.document.id, name: log.document.name } : null,
          metadata: log.metadata ? JSON.parse(log.metadata) : null,
        })),
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch workspace overview' });
    }
  }
);

/**
 * GET /api/workspaces/:companyId/members
 * List members in workspace
 */
router.get(
  '/:companyId/members',
  requireAuth,
  requireTenantMembership(),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const companyId = req.tenant!.companyId;

      const members = await prisma.membership.findMany({
        where: { companyId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              avatarUrl: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      res.json(
        members.map((m) => ({
          userId: m.user.id,
          email: m.user.email,
          fullName: m.user.fullName,
          avatarUrl: m.user.avatarUrl,
          role: m.role,
          status: m.status,
          joinedAt: m.createdAt,
        }))
      );
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve workspace members' });
    }
  }
);

/**
 * POST /api/workspaces/:companyId/members
 * Invite an existing user to the workspace (ADMIN only)
 */
router.post(
  '/:companyId/members',
  requireAuth,
  requireTenantMembership(['ADMIN']),
  validateRequest({ body: inviteMemberSchema }),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const companyId = req.tenant!.companyId;
      const { email, role } = req.body;

      const targetUser = await prisma.user.findUnique({ where: { email } });
      if (!targetUser) {
        res.status(404).json({
          error: 'User not found. They must first create an account on TrustVault before being added.',
          code: 'USER_NOT_REGISTERED',
        });
        return;
      }

      // Check if already a member
      const existing = await prisma.membership.findUnique({
        where: {
          userId_companyId: {
            userId: targetUser.id,
            companyId,
          },
        },
      });

      if (existing) {
        if (existing.status === 'ACTIVE') {
          res.status(409).json({ error: 'User is already an active member of this workspace' });
          return;
        }

        // Reactivate
        await prisma.membership.update({
          where: { id: existing.id },
          data: { status: 'ACTIVE', role },
        });
      } else {
        await prisma.membership.create({
          data: {
            userId: targetUser.id,
            companyId,
            role,
            status: 'ACTIVE',
          },
        });
      }

      await recordAuditLog({
        companyId,
        actorId: req.user!.id,
        action: 'MEMBER_INVITED',
        outcome: 'SUCCESS',
        metadata: { targetUserId: targetUser.id, targetEmail: targetUser.email, assignedRole: role },
        req,
      });

      res.status(201).json({
        message: `User ${targetUser.email} successfully added with role ${role}`,
        member: {
          userId: targetUser.id,
          email: targetUser.email,
          fullName: targetUser.fullName,
          role,
        },
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to add member' });
    }
  }
);

/**
 * PATCH /api/workspaces/:companyId/members/:userId
 * Change member role (ADMIN only)
 */
router.patch(
  '/:companyId/members/:userId',
  requireAuth,
  requireTenantMembership(['ADMIN']),
  validateRequest({ body: updateRoleSchema }),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const companyId = req.tenant!.companyId;
      const userId = req.params.userId as string;
      const { role } = req.body;

      // Prevent demoting the last admin
      if (role !== 'ADMIN') {
        const adminCount = await prisma.membership.count({
          where: { companyId, role: 'ADMIN', status: 'ACTIVE' },
        });
        const currentMembership = await prisma.membership.findUnique({
          where: { userId_companyId: { userId, companyId } },
        });

        if (currentMembership?.role === 'ADMIN' && adminCount <= 1) {
          res.status(400).json({
            error: 'Cannot demote the last administrator of the workspace.',
            code: 'LAST_ADMIN_PROTECTED',
          });
          return;
        }
      }

      const updated = await prisma.membership.update({
        where: { userId_companyId: { userId, companyId } },
        data: { role },
      });

      await recordAuditLog({
        companyId,
        actorId: req.user!.id,
        action: 'MEMBER_ROLE_CHANGED',
        outcome: 'SUCCESS',
        metadata: { targetUserId: userId, newRole: role },
        req,
      });

      res.json({ message: 'Role updated successfully', role: updated.role });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update member role' });
    }
  }
);

/**
 * DELETE /api/workspaces/:companyId/members/:userId
 * Remove member from workspace (ADMIN only)
 */
router.delete(
  '/:companyId/members/:userId',
  requireAuth,
  requireTenantMembership(['ADMIN']),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      const companyId = req.tenant!.companyId;
      const userId = req.params.userId as string;

      if (userId === req.user!.id) {
        res.status(400).json({
          error: 'You cannot remove yourself from the workspace. Transfer admin rights first.',
        });
        return;
      }

      await prisma.membership.delete({
        where: { userId_companyId: { userId, companyId } },
      });

      await recordAuditLog({
        companyId,
        actorId: req.user!.id,
        action: 'MEMBER_REMOVED',
        outcome: 'SUCCESS',
        metadata: { removedUserId: userId },
        req,
      });

      res.json({ message: 'Member removed successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to remove member' });
    }
  }
);

export default router;
