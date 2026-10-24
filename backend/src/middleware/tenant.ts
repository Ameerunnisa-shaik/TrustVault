import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from '../types';
import { prisma } from '../db';
import { recordAuditLog } from '../utils/audit';

/**
 * Middleware that verifies the authenticated user belongs to the requested company (tenant).
 * Company ID is resolved from route param :companyId, query ?companyId, or header x-company-id.
 * Attaches req.tenant to the request.
 */
export function requireTenantMembership(allowedRoles?: UserRole[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' });
        return;
      }

      // Resolve companyId safely
      const companyId =
        req.params.companyId ||
        (req.query.companyId as string) ||
        (req.headers['x-company-id'] as string) ||
        req.body.companyId;

      if (!companyId) {
        res.status(400).json({
          error: 'Workspace context missing: companyId must be provided',
          code: 'MISSING_COMPANY_ID',
        });
        return;
      }

      // Query membership from database - never trust client assertion
      const membership = await prisma.membership.findUnique({
        where: {
          userId_companyId: {
            userId: req.user.id,
            companyId,
          },
        },
        include: {
          company: true,
        },
      });

      if (!membership || membership.status !== 'ACTIVE') {
        // Record denied cross-tenant access attempt in audit log
        await recordAuditLog({
          companyId,
          actorId: req.user.id,
          action: 'CROSS_TENANT_ACCESS_ATTEMPT',
          outcome: 'DENIED',
          metadata: { attemptedRoute: req.originalUrl, method: req.method },
          req,
        });

        res.status(403).json({
          error: 'Access denied: You are not an active member of this company workspace.',
          code: 'TENANT_ACCESS_DENIED',
        });
        return;
      }

      const userRole = membership.role as UserRole;

      // Check role permissions if specified
      if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(userRole)) {
          await recordAuditLog({
            companyId,
            actorId: req.user.id,
            action: 'INSUFFICIENT_ROLE_PRIVILEGE',
            outcome: 'DENIED',
            metadata: { requiredRoles: allowedRoles, actualRole: userRole, route: req.originalUrl },
            req,
          });

          res.status(403).json({
            error: `Access denied: Action requires one of the following roles: ${allowedRoles.join(', ')}`,
            code: 'INSUFFICIENT_ROLE',
          });
          return;
        }
      }

      req.tenant = {
        companyId: membership.companyId,
        companyName: membership.company.name,
        role: userRole,
      };

      next();
    } catch (error) {
      console.error('Tenant membership check error:', error);
      res.status(500).json({ error: 'Failed to verify workspace permissions' });
    }
  };
}
