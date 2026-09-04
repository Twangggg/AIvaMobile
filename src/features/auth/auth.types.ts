export type UserRole = 'parent' | 'teacher' | 'admin';

export type UserInfo = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  emailConfirmed: boolean;
};

export type Tokens = {
  accessToken: string;
  refreshToken: string;
  user?: UserInfo;
};

export type LoginPayload = { email: string; password: string };

export type RegisterPayload = {
  email: string;
  password: string;
  displayName: string;
};

export type UpdateProfilePayload = { displayName: string };

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export function normalizeRole(raw?: string | null): UserRole {
  if (raw === 'parent') return 'parent';
  if (raw === 'admin') return 'admin';
  return 'teacher';
}

export function mapUserInfo(raw?: {
  id: string;
  email?: string | null;
  display_name?: string | null;
  displayName?: string | null;
  role?: string | null;
  emailConfirmed?: boolean;
} | null): UserInfo | undefined {
  if (!raw) return undefined;
  return {
    id: raw.id,
    email: raw.email ?? '',
    displayName: raw.display_name ?? raw.displayName ?? '',
    role: normalizeRole(raw.role),
    emailConfirmed: Boolean(raw.emailConfirmed),
  };
}

export function roleFromTokens(tokens: Tokens | null | undefined): UserRole {
  if (!tokens?.user?.role) return 'teacher';
  return normalizeRole(tokens.user.role);
}
