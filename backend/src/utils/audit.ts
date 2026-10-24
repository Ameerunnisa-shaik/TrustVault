import { Request } from 'express';
import { prisma } from '../db';

export interface AuditParams {
  companyId: string;
  actorId?: string | null;
  documentId?: string | null;
  action: string;
  outcome: 'SUCCESS' | 'DENIED';
  metadata?: Record<string, any>;
  req?: Request;
}

/**
 * Records a security audit event in the database.
 * Never logs sensitive credentials, passwords, tokens, or raw document content.
 */
export async function recordAuditLog(params: AuditParams): Promise<void> {
  try {
    const ipAddress = params.req
      ? (params.req.headers['x-forwarded-for'] as string) || params.req.socket.remoteAddress || null
      : null;
    const userAgent = params.req ? (params.req.headers['user-agent'] as string) || null : null;

    // Filter metadata to prevent accidental leaks of sensitive fields
    const safeMetadata = params.metadata ? { ...params.metadata } : {};
    delete safeMetadata.password;
    delete safeMetadata.token;
    delete safeMetadata.jwt;
    delete safeMetadata.secret;
    delete safeMetadata.content;

    await prisma.auditLog.create({
      data: {
        companyId: params.companyId,
        actorId: params.actorId || null,
        documentId: params.documentId || null,
        action: params.action,
        outcome: params.outcome,
        ipAddress,
        userAgent,
        metadata: Object.keys(safeMetadata).length > 0 ? JSON.stringify(safeMetadata) : null,
      },
    });
  } catch (error) {
    // Audit logging failure should not crash the request, but must be printed to server errors
    console.error('[AuditTrail] Failed to record audit log:', error);
  }
}
