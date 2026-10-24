import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, PermissionLevel } from '../types';
import { prisma } from '../db';
import { recordAuditLog } from '../utils/audit';
import { Document } from '@prisma/client';

export interface DocumentRequest extends AuthenticatedRequest {
  document?: Document;
  effectivePermission?: PermissionLevel;
}

const PERMISSION_HIERARCHY: Record<PermissionLevel, number> = {
  VIEW: 1,
  DOWNLOAD: 2,
  SHARE: 3,
  ADMIN: 4,
};

/**
 * Validates whether grantedPermission satisfies requiredPermission according to the hierarchy.
 */
export function hasPermissionLevel(
  granted: PermissionLevel,
  required: PermissionLevel
): boolean {
  return PERMISSION_HIERARCHY[granted] >= PERMISSION_HIERARCHY[required];
}

/**
 * Enforces strict document-level authorization.
 * Checks tenant boundaries, ownership, role overrides, and explicit DocumentPermission grants.
 */
export function requireDocumentAccess(requiredLevel: PermissionLevel) {
  return async (req: DocumentRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' });
        return;
      }

      const documentId = req.params.documentId || req.params.id || req.body.documentId;
      if (!documentId) {
        res.status(400).json({ error: 'Document ID is required', code: 'MISSING_DOCUMENT_ID' });
        return;
      }

      // 1. Fetch document
      const doc = await prisma.document.findUnique({
        where: { id: documentId },
        include: {
          permissions: {
            where: {
              userId: req.user.id,
            },
          },
        },
      });

      if (!doc || doc.isArchived) {
        res.status(404).json({ error: 'Document not found or has been removed', code: 'DOCUMENT_NOT_FOUND' });
        return;
      }

      // 2. Verify Tenant Isolation: User must be an active member of the company that owns the document
      const membership = await prisma.membership.findUnique({
        where: {
          userId_companyId: {
            userId: req.user.id,
            companyId: doc.companyId,
          },
        },
      });

      if (!membership || membership.status !== 'ACTIVE') {
        // Log cross-tenant unauthorized document access attempt
        await recordAuditLog({
          companyId: doc.companyId,
          actorId: req.user.id,
          documentId: doc.id,
          action: 'CROSS_TENANT_DOCUMENT_ACCESS',
          outcome: 'DENIED',
          metadata: { attemptedLevel: requiredLevel, userCompanyAttempt: true },
          req,
        });

        // Return 404 to avoid leaking document existence to other tenants
        res.status(404).json({ error: 'Document not found', code: 'DOCUMENT_NOT_FOUND' });
        return;
      }

      // 3. Authorization Check:
      // Case A: User is the Document Owner
      if (doc.ownerId === req.user.id) {
        req.document = doc;
        req.effectivePermission = 'ADMIN';
        return next();
      }

      // Case B: User is a Company Admin
      if (membership.role === 'ADMIN') {
        req.document = doc;
        req.effectivePermission = 'ADMIN';
        return next();
      }

      // Case C: Check explicit DocumentPermission grant
      const explicitGrant = doc.permissions[0]; // Filtered by userId above

      if (!explicitGrant) {
        await recordAuditLog({
          companyId: doc.companyId,
          actorId: req.user.id,
          documentId: doc.id,
          action: 'DOCUMENT_ACCESS_NO_GRANT',
          outcome: 'DENIED',
          metadata: { requiredLevel },
          req,
        });

        res.status(403).json({
          error: 'Access denied: You do not have permission to access this document.',
          code: 'PERMISSION_DENIED',
        });
        return;
      }

      // Check if permission has been REVOKED
      if (explicitGrant.revokedAt !== null) {
        await recordAuditLog({
          companyId: doc.companyId,
          actorId: req.user.id,
          documentId: doc.id,
          action: 'DOCUMENT_ACCESS_REVOKED_GRANT',
          outcome: 'DENIED',
          metadata: { revokedAt: explicitGrant.revokedAt, requiredLevel },
          req,
        });

        res.status(403).json({
          error: 'Access denied: Your permission to this document has been revoked.',
          code: 'PERMISSION_REVOKED',
        });
        return;
      }

      // Check if permission has EXPIRED
      if (explicitGrant.expiresAt !== null && new Date(explicitGrant.expiresAt) < new Date()) {
        await recordAuditLog({
          companyId: doc.companyId,
          actorId: req.user.id,
          documentId: doc.id,
          action: 'DOCUMENT_ACCESS_EXPIRED_GRANT',
          outcome: 'DENIED',
          metadata: { expiresAt: explicitGrant.expiresAt, requiredLevel },
          req,
        });

        res.status(403).json({
          error: 'Access denied: Your temporary access to this document has expired.',
          code: 'PERMISSION_EXPIRED',
        });
        return;
      }

      // Check if the granted permission level satisfies the required level
      const grantedLevel = explicitGrant.permission as PermissionLevel;
      if (!hasPermissionLevel(grantedLevel, requiredLevel)) {
        await recordAuditLog({
          companyId: doc.companyId,
          actorId: req.user.id,
          documentId: doc.id,
          action: 'DOCUMENT_INSUFFICIENT_LEVEL',
          outcome: 'DENIED',
          metadata: { grantedLevel, requiredLevel },
          req,
        });

        res.status(403).json({
          error: `Access denied: Action requires '${requiredLevel}' permission, but you only have '${grantedLevel}'.`,
          code: 'INSUFFICIENT_PERMISSION',
        });
        return;
      }

      // Authorization passed
      req.document = doc;
      req.effectivePermission = grantedLevel;
      next();
    } catch (error) {
      console.error('Document permission check error:', error);
      res.status(500).json({ error: 'Internal document authorization check failed' });
    }
  };
}
