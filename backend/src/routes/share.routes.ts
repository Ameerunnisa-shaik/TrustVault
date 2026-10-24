import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';
import { requireDocumentAccess, DocumentRequest, hasPermissionLevel } from '../middleware/permissions';
import { validateRequest } from '../middleware/validate';
import { recordAuditLog } from '../utils/audit';
import { PermissionLevel } from '../types';

const router = Router();

const shareSchema = z.object({
  recipientEmail: z.string().email('Valid recipient email required').toLowerCase().trim(),
  permission: z.enum(['VIEW', 'DOWNLOAD', 'SHARE', 'ADMIN']),
  expiresAt: z.string().datetime().optional().nullable(),
});

/**
 * POST /api/documents/:id/share
 * Grant explicit document access to a coworker in the same workspace
 * Requires SHARE permission
 */
router.post(
  '/:id/share',
  requireAuth,
  requireDocumentAccess('SHARE'),
  validateRequest({ body: shareSchema }),
  async (req: DocumentRequest, res: Response): Promise<void> => {
    try {
      const doc = req.document!;
      const requesterId = req.user!.id;
      const { recipientEmail, permission, expiresAt } = req.body;

      // 1. Find recipient
      const recipient = await prisma.user.findUnique({
        where: { email: recipientEmail },
      });

      if (!recipient) {
        res.status(404).json({
          error: 'User not found. Recipient must register on TrustVault first.',
          code: 'RECIPIENT_NOT_FOUND',
        });
        return;
      }

      if (recipient.id === doc.ownerId) {
        res.status(400).json({ error: 'Cannot share document with its owner' });
        return;
      }

      // 2. Verify Recipient Workspace Eligibility: Recipient must belong to the SAME tenant!
      const recipientMembership = await prisma.membership.findUnique({
        where: {
          userId_companyId: {
            userId: recipient.id,
            companyId: doc.companyId,
          },
        },
      });

      if (!recipientMembership || recipientMembership.status !== 'ACTIVE') {
        await recordAuditLog({
          companyId: doc.companyId,
          actorId: requesterId,
          documentId: doc.id,
          action: 'DOC_SHARE_CROSS_TENANT_REJECTED',
          outcome: 'DENIED',
          metadata: { recipientEmail, recipientId: recipient.id },
          req,
        });

        res.status(403).json({
          error: 'Security violation: Cannot share documents with users outside this company workspace.',
          code: 'CROSS_TENANT_SHARE_DENIED',
        });
        return;
      }

      // 3. Verify Privilege Escalation Protection:
      // A user cannot grant a permission level higher than their own effective permission
      // (Unless they are the document owner or an ADMIN)
      const requesterEffective = req.effectivePermission!;
      if (
        requesterId !== doc.ownerId &&
        requesterEffective !== 'ADMIN' &&
        !hasPermissionLevel(requesterEffective, permission as PermissionLevel)
      ) {
        await recordAuditLog({
          companyId: doc.companyId,
          actorId: requesterId,
          documentId: doc.id,
          action: 'PRIVILEGE_ESCALATION_ATTEMPT',
          outcome: 'DENIED',
          metadata: { attemptedGrant: permission, currentEffective: requesterEffective },
          req,
        });

        res.status(403).json({
          error: `Privilege escalation blocked: You cannot grant '${permission}' permission because you only have '${requesterEffective}'.`,
          code: 'PRIVILEGE_ESCALATION_DENIED',
        });
        return;
      }

      // 4. Create or update DocumentPermission grant (clears previous revocation)
      const parsedExpiresAt = expiresAt ? new Date(expiresAt) : null;

      const grant = await prisma.documentPermission.upsert({
        where: {
          documentId_userId: {
            documentId: doc.id,
            userId: recipient.id,
          },
        },
        update: {
          permission,
          grantedById: requesterId,
          expiresAt: parsedExpiresAt,
          revokedAt: null, // Clear revocation if previously revoked
        },
        create: {
          documentId: doc.id,
          userId: recipient.id,
          permission,
          grantedById: requesterId,
          expiresAt: parsedExpiresAt,
          revokedAt: null,
        },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          grantedBy: { select: { id: true, fullName: true, email: true } },
        },
      });

      await recordAuditLog({
        companyId: doc.companyId,
        actorId: requesterId,
        documentId: doc.id,
        action: 'DOC_SHARE',
        outcome: 'SUCCESS',
        metadata: {
          recipientId: recipient.id,
          recipientEmail: recipient.email,
          permission,
          expiresAt: parsedExpiresAt,
        },
        req,
      });

      res.status(200).json({
        message: `Successfully granted '${permission}' permission to ${recipient.email}`,
        grant: {
          id: grant.id,
          permission: grant.permission,
          expiresAt: grant.expiresAt,
          user: grant.user,
          grantedBy: grant.grantedBy,
          createdAt: grant.createdAt,
        },
      });
    } catch (error) {
      console.error('Share error:', error);
      res.status(500).json({ error: 'Failed to share document' });
    }
  }
);

/**
 * GET /api/documents/:id/permissions
 * List all current and revoked permission grants for a document
 * Requires SHARE permission
 */
router.get(
  '/:id/permissions',
  requireAuth,
  requireDocumentAccess('SHARE'),
  async (req: DocumentRequest, res: Response): Promise<void> => {
    try {
      const doc = req.document!;

      const permissions = await prisma.documentPermission.findMany({
        where: { documentId: doc.id },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
          grantedBy: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(
        permissions.map((p) => ({
          id: p.id,
          userId: p.userId,
          user: p.user,
          permission: p.permission,
          grantedBy: p.grantedBy,
          expiresAt: p.expiresAt,
          isExpired: p.expiresAt ? new Date(p.expiresAt) < new Date() : false,
          isRevoked: p.revokedAt !== null,
          revokedAt: p.revokedAt,
          createdAt: p.createdAt,
        }))
      );
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch permissions' });
    }
  }
);

/**
 * POST /api/documents/:id/revoke/:userId
 * Revoke document access for a user immediately
 * Requires SHARE permission
 */
router.post(
  '/:id/revoke/:userId',
  requireAuth,
  requireDocumentAccess('SHARE'),
  async (req: DocumentRequest, res: Response): Promise<void> => {
    try {
      const doc = req.document!;
      const targetUserId = req.params.userId as string;

      const existingGrant = await prisma.documentPermission.findUnique({
        where: {
          documentId_userId: {
            documentId: doc.id,
            userId: targetUserId,
          },
        },
        include: { user: true },
      });

      if (!existingGrant) {
        res.status(404).json({ error: 'No active permission found for this user' });
        return;
      }

      // Mark permission as revoked
      const revoked = await prisma.documentPermission.update({
        where: { id: existingGrant.id },
        data: {
          revokedAt: new Date(),
        },
      });

      await recordAuditLog({
        companyId: doc.companyId,
        actorId: req.user!.id,
        documentId: doc.id,
        action: 'DOC_REVOKE',
        outcome: 'SUCCESS',
        metadata: {
          targetUserId,
          targetEmail: existingGrant.user.email,
          previousPermission: existingGrant.permission,
          revokedAt: revoked.revokedAt,
        },
        req,
      });

      res.json({
        message: `Access successfully revoked for ${existingGrant.user.email}`,
        revokedAt: revoked.revokedAt,
      });
    } catch (error) {
      console.error('Revoke error:', error);
      res.status(500).json({ error: 'Failed to revoke document access' });
    }
  }
);

export default router;
