import type { UserInfo } from '@workos-inc/authkit-nextjs';
import type { Impersonator, User } from '@workos-inc/node';
import { z } from 'zod';

export enum Aud {
  Authenticated = 'authenticated',
  Anonymous = 'anonymous',
}

export enum SupabaseRole {
  Authenticated = 'authenticated',
  Anonymous = 'anon',
  ServiceRole = 'service_role',
}

const ExpirationTime = z
  .number()
  .describe('The expiration time of the session in seconds since epoch');

export enum WorkspaceRole {
  VIEWER = 'viewer',
  MEMBER = 'member',
  ADMIN = 'admin',
}

export enum PermissionScope {}
// Add your permission scopes here
// Example:
// AGENTS_READ = 'agents:read',
// AGENTS_WRITE = 'agents:write',

export const RoleScopes: Record<WorkspaceRole, PermissionScope[]> = {
  [WorkspaceRole.VIEWER]: [],
  [WorkspaceRole.MEMBER]: [],
  [WorkspaceRole.ADMIN]: [],
};

export const UserMetadata = z.object({
  workspace_id: z
    .string()
    .uuid()
    .describe('The workspace ID that the user is logged in to'),
  scopes: z.array(z.nativeEnum(PermissionScope)),
});

export const AuthenticatedSubject = z.object({
  aud: z
    .literal(Aud.Authenticated)
    .describe('Audience. The audience of the token'),
  email: z.string().describe('The email of the user'),
  exp: ExpirationTime,
  role: z.literal(SupabaseRole.Authenticated),
  sub: z.string().uuid().describe('Subject. The user ID'),
  user_metadata: UserMetadata,
});

export type AuthenticatedSubject = z.infer<typeof AuthenticatedSubject>;

export const AuthInfo = z.object({
  user: z.custom<User>(),
  sessionId: z.string(),
  organization_id: z.string().optional(),
  role: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  entitlements: z.array(z.string()).optional(),
  featureFlags: z.array(z.string()).optional(),
  impersonator: z.custom<Impersonator>().optional(),
  access_token: z.string(),
});

export type AuthInfo = z.infer<typeof AuthInfo>;

export function userInfoToAuthInfo(userInfo: UserInfo): AuthInfo {
  return {
    user: userInfo.user,
    sessionId: userInfo.sessionId,
    organization_id: userInfo.organizationId,
    role: userInfo.role,
    permissions: userInfo.permissions,
    entitlements: userInfo.entitlements,
    featureFlags: userInfo.featureFlags,
    impersonator: userInfo.impersonator,
    access_token: userInfo.accessToken,
  };
}
