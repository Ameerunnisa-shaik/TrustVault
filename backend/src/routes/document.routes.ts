import { Router, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';
import { requireTenantMembership } from '../middleware/tenant';
import { requireDocumentAccess, DocumentRequest } from '../middleware/permissions';
import { storageService } from '../services/storage';
import { recordAuditLog } from '../utils/audit';
import { AuthenticatedRequest } from '../types';

const router = Router();

// Configure Multer for secure memory buffer upload with file size ceiling
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB ceiling (actual validation in storageService)
  },
});

const renameSchema = z.object({
  name: z.string().min(1, 'Document name cannot be empty').max(255).trim(),
});

/**
 * POST /api/documents/upload
 * Upload a document to the current company workspace
 * Requires ADMIN or MEMBER role (VIEWER cannot upload)
 */
router.post(
  '/upload',
  requireAuth,
  requireTenantMembership(['ADMIN', 'MEMBER']),
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const companyId = req.tenant!.companyId;
      const file = req.file;

      if (!file) {
        res.status(400).json({ error: 'No file provided in upload request', code: 'FILE_MISSING' });
        return;
      }

      // Validate MIME type and size
      const validation = storageService.validateFile(file.mimetype, file.size);
      if (!validation.valid) {
        await recordAuditLog({
          companyId,
          actorId: req.user!.id,
          action: 'DOC_UPLOAD_REJECTED',
          outcome: 'DENIED',
          metadata: { filename: file.originalname, size: file.size, reason: validation.error },
          req,
        });

        res.status(400).json({ error: validation.error, code: 'INVALID_FILE' });
        return;
      }

      const safeOriginalName = storageService.sanitizeFilename(file.originalname);
      const displayName = (req.body.name || safeOriginalName).trim();

      // Persist to private storage
      const saved = await storageService.saveFile(file.buffer, safeOriginalName);

      // Create document record
      const document = await prisma.document.create({
        data: {
          companyId,
          ownerId: req.user!.id,
          name: displayName,
          originalName: safeOriginalName,
          mimeType: file.mimetype,
          sizeBytes: saved.sizeBytes,
          storageKey: saved.storageKey,
          checksum: saved.checksum,
        },
        include: {
          owner: { select: { id: true, fullName: true, email: true } },
        },
      });

      await recordAuditLog({
        companyId,
        actorId: req.user!.id,
        documentId: document.id,
        action: 'DOC_UPLOAD',
        outcome: 'SUCCESS',
        metadata: {
          name: document.name,
          originalName: document.originalName,
          sizeBytes: document.sizeBytes,
          mimeType: document.mimeType,
        },
        req,
      });

      res.status(201).json({
        message: 'Document uploaded successfully',
        document: {
          id: document.id,
          name: document.name,
          originalName: document.originalName,
          mimeType: document.mimeType,
          sizeBytes: document.sizeBytes,
          createdAt: document.createdAt,
          owner: document.owner,
        },
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to upload document' });
    }
  }
);

/**
 * GET /api/documents
 * List all documents the user is authorized to discover in the workspace
 */
router.get(
  '/',
  requireAuth,
  requireTenantMembership(),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const companyId = req.tenant!.companyId;
      const userId = req.user!.id;
      const isAdmin = req.tenant!.role === 'ADMIN';

      // Build discovery filter:
      // Admins can see all non-archived docs in the company
      // Members/Viewers see docs they own OR have an active, non-revoked, non-expired permission grant
      let whereClause: any = {
        companyId,
        isArchived: false,
      };

      if (!isAdmin) {
        whereClause = {
          companyId,
          isArchived: false,
          OR: [
            { ownerId: userId },
            {
              permissions: {
                some: {
                  userId,
                  revokedAt: null,
                  OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
                },
              },
            },
          ],
        };
      }

      const docs = await prisma.document.findMany({
        where: whereClause,
        include: {
          owner: { select: { id: true, fullName: true, email: true } },
          permissions: {
            where: {
              userId,
              revokedAt: null,
            },
          },
          _count: {
            select: {
              permissions: {
                where: { revokedAt: null },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const responseList = docs.map((doc) => {
        let effectivePermission = 'VIEW';
        if (doc.ownerId === userId || isAdmin) {
          effectivePermission = 'ADMIN';
        } else if (doc.permissions.length > 0) {
          effectivePermission = doc.permissions[0].permission;
        }

        return {
          id: doc.id,
          name: doc.name,
          originalName: doc.originalName,
          mimeType: doc.mimeType,
          sizeBytes: doc.sizeBytes,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          owner: doc.owner,
          isOwner: doc.ownerId === userId,
          effectivePermission,
          activeSharesCount: doc._count.permissions,
        };
      });

      res.json(responseList);
    } catch (error) {
      console.error('List documents error:', error);
      res.status(500).json({ error: 'Failed to retrieve documents' });
    }
  }
);

/**
 * GET /api/documents/:id
 * Get document metadata (requires VIEW permission)
 */
router.get(
  '/:id',
  requireAuth,
  requireDocumentAccess('VIEW'),
  async (req: DocumentRequest, res: Response): Promise<void> => {
    try {
      const doc = req.document!;

      const fullDoc = await prisma.document.findUnique({
        where: { id: doc.id },
        include: {
          owner: { select: { id: true, fullName: true, email: true } },
          company: { select: { id: true, name: true } },
          permissions: {
            where: { revokedAt: null },
            include: {
              user: { select: { id: true, fullName: true, email: true } },
              grantedBy: { select: { id: true, fullName: true, email: true } },
            },
          },
        },
      });

      if (!fullDoc) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }

      await recordAuditLog({
        companyId: doc.companyId,
        actorId: req.user!.id,
        documentId: doc.id,
        action: 'DOC_VIEW',
        outcome: 'SUCCESS',
        metadata: { effectivePermission: req.effectivePermission },
        req,
      });

      res.json({
        id: fullDoc.id,
        name: fullDoc.name,
        originalName: fullDoc.originalName,
        mimeType: fullDoc.mimeType,
        sizeBytes: fullDoc.sizeBytes,
        checksum: fullDoc.checksum,
        createdAt: fullDoc.createdAt,
        updatedAt: fullDoc.updatedAt,
        owner: fullDoc.owner,
        company: fullDoc.company,
        effectivePermission: req.effectivePermission,
        permissions: fullDoc.permissions.map((p) => ({
          id: p.id,
          user: p.user,
          permission: p.permission,
          grantedBy: p.grantedBy,
          expiresAt: p.expiresAt,
          createdAt: p.createdAt,
        })),
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve document details' });
    }
  }
);

/**
 * GET /api/documents/:id/download
 * Download confidential document (requires DOWNLOAD permission)
 */
router.get(
  '/:id/download',
  requireAuth,
  requireDocumentAccess('DOWNLOAD'),
  async (req: DocumentRequest, res: Response): Promise<void> => {
    try {
      const doc = req.document!;
      const fileStream = storageService.getFileStream(doc.storageKey);

      await recordAuditLog({
        companyId: doc.companyId,
        actorId: req.user!.id,
        documentId: doc.id,
        action: 'DOC_DOWNLOAD',
        outcome: 'SUCCESS',
        metadata: { filename: doc.originalName, size: doc.sizeBytes },
        req,
      });

      res.setHeader('Content-Type', doc.mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(doc.originalName)}"`
      );
      res.setHeader('Content-Length', doc.sizeBytes);

      fileStream.pipe(res);
    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({ error: 'Failed to stream document' });
    }
  }
);

/**
 * GET /api/documents/:id/preview
 * Preview document inline in browser (requires VIEW permission)
 */
router.get(
  '/:id/preview',
  requireAuth,
  requireDocumentAccess('VIEW'),
  async (req: DocumentRequest, res: Response): Promise<void> => {
    try {
      const doc = req.document!;
      const fileStream = storageService.getFileStream(doc.storageKey);

      res.setHeader('Content-Type', doc.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.originalName)}"`);
      res.setHeader('Content-Length', doc.sizeBytes);

      fileStream.pipe(res);
    } catch (error) {
      res.status(500).json({ error: 'Failed to stream preview' });
    }
  }
);

/**
 * PATCH /api/documents/:id
 * Rename document (requires ADMIN permission)
 */
router.patch(
  '/:id',
  requireAuth,
  requireDocumentAccess('ADMIN'),
  async (req: DocumentRequest, res: Response): Promise<void> => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({ error: 'Valid name is required' });
        return;
      }

      const updated = await prisma.document.update({
        where: { id: req.document!.id },
        data: { name: name.trim() },
      });

      await recordAuditLog({
        companyId: updated.companyId,
        actorId: req.user!.id,
        documentId: updated.id,
        action: 'DOC_RENAME',
        outcome: 'SUCCESS',
        metadata: { oldName: req.document!.name, newName: updated.name },
        req,
      });

      res.json({ message: 'Document renamed successfully', document: updated });
    } catch (error) {
      res.status(500).json({ error: 'Failed to rename document' });
    }
  }
);

/**
 * DELETE /api/documents/:id
 * Delete document (requires ADMIN permission)
 */
router.delete(
  '/:id',
  requireAuth,
  requireDocumentAccess('ADMIN'),
  async (req: DocumentRequest, res: Response): Promise<void> => {
    try {
      const doc = req.document!;

      // Remove from physical storage
      await storageService.deleteFile(doc.storageKey);

      // Delete database record (cascades permissions & sets null on audit logs)
      await prisma.document.delete({
        where: { id: doc.id },
      });

      await recordAuditLog({
        companyId: doc.companyId,
        actorId: req.user!.id,
        documentId: doc.id,
        action: 'DOC_DELETE',
        outcome: 'SUCCESS',
        metadata: { deletedDocumentName: doc.name },
        req,
      });

      res.json({ message: 'Document deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete document' });
    }
  }
);

export default router;
