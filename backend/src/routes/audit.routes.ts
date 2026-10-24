import { Router, Response } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';
import { requireTenantMembership } from '../middleware/tenant';
import { AuthenticatedRequest } from '../types';

const router = Router();

/**
 * GET /api/audit-logs
 * Retrieve company audit trail records.
 * Accessible only by workspace ADMINs (or authorized workspace members).
 * Strictly scoped to the authenticated tenant.
 */
router.get(
  '/',
  requireAuth,
  requireTenantMembership(['ADMIN']),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const companyId = req.tenant!.companyId;

      const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '25', 10)));
      const skip = (page - 1) * limit;

      const action = req.query.action as string | undefined;
      const outcome = req.query.outcome as string | undefined;
      const documentId = req.query.documentId as string | undefined;
      const actorId = req.query.actorId as string | undefined;

      const where: any = { companyId };
      if (action) where.action = action;
      if (outcome) where.outcome = outcome;
      if (documentId) where.documentId = documentId;
      if (actorId) where.actorId = actorId;

      const [totalCount, logs] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            actor: { select: { id: true, fullName: true, email: true } },
            document: { select: { id: true, name: true, originalName: true } },
          },
        }),
      ]);

      res.json({
        logs: logs.map((log) => ({
          id: log.id,
          action: log.action,
          outcome: log.outcome,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          createdAt: log.createdAt,
          actor: log.actor ? { id: log.actor.id, name: log.actor.fullName, email: log.actor.email } : null,
          document: log.document
            ? { id: log.document.id, name: log.document.name, originalName: log.document.originalName }
            : null,
          metadata: log.metadata ? JSON.parse(log.metadata) : null,
        })),
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      });
    } catch (error) {
      console.error('Audit log fetch error:', error);
      res.status(500).json({ error: 'Failed to retrieve audit trail records' });
    }
  }
);

export default router;
