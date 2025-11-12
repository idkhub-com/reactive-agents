import { SUPABASE_JWT_SECRET } from '@server/constants';
import type { AuthenticatedSubject, PermissionScope } from '@shared/types/auth';
import {
  Aud,
  RoleScopes,
  SupabaseRole,
  WorkspaceRole,
} from '@shared/types/auth';
import type { UserInfo } from '@workos-inc/authkit-nextjs';
import { SignJWT } from 'jose';

/**
 * Utility function to check if a subject has all of the specified scopes
 */
export function hasAllPermissionScopes(
  subject: AuthenticatedSubject,
  scopes: PermissionScope[],
): boolean {
  // Since PermissionScope is currently an empty enum, this will always return true for empty arrays
  // When scopes are added to the enum, this will properly check them
  const subjectScopes = subject.user_metadata
    .scopes as unknown as readonly PermissionScope[];
  return scopes.every((scope) => subjectScopes.includes(scope));
}

export async function createSupabaseAccessTokenFromUserInfo(
  userInfo: UserInfo,
  jwtSecret: string = SUPABASE_JWT_SECRET,
): Promise<{
  authenticatedSubject: AuthenticatedSubject;
  accessToken: string;
}> {
  // Use default workspace if organizationId is null (for tests and edge cases)
  const workspaceId = userInfo.organizationId || 'default-workspace';
  // Default to MEMBER role if not provided
  const role = (userInfo.role as WorkspaceRole) || WorkspaceRole.MEMBER;
  // 1 hour expiration since it will only be used in this request
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
  const payload = {
    aud: Aud.Authenticated,
    email: userInfo.user.email,
    exp: expiresAt,
    role: SupabaseRole.Authenticated,
    sub: userInfo.user.id,
    user_metadata: {
      workspace_id: workspaceId,
      // Type assertion needed because PermissionScope is currently an empty enum
      // When scopes are added, this will work correctly
      scopes: (RoleScopes[role] || []) as unknown as PermissionScope[],
    },
  } as unknown as AuthenticatedSubject;
  const encodedJwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(expiresAt)
    .sign(new TextEncoder().encode(jwtSecret));
  return {
    authenticatedSubject: payload,
    accessToken: encodedJwt,
  };
}
