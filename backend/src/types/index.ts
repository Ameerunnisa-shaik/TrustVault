import { Request } from 'express';

export type UserRole = 'ADMIN' | 'MEMBER' | 'VIEWER';

export type PermissionLevel = 'VIEW' | 'DOWNLOAD' | 'SHARE' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
}

export interface TenantContext {
  companyId: string;
  companyName: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  tenant?: TenantContext;
}
