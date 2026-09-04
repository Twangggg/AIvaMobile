import { supabase } from '@/lib/supabase';
import { ApiError } from '@/services/http/errors';

import type {
  ChangePasswordPayload,
  LoginPayload,
  RegisterPayload,
  Tokens,
  UpdateProfilePayload,
  UserInfo,
} from './auth.types';
import { mapUserInfo, normalizeRole } from './auth.types';

type ProfileRow = {
  id: string;
  email: string;
  display_name: string;
  role: string;
};

async function sessionToTokens(): Promise<Tokens | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new ApiError(error.message, 401);
  const session = data.session;
  if (!session?.user) return null;

  const profile = await fetchProfile(session.user.id);
  const user: UserInfo = profile ?? {
    id: session.user.id,
    email: session.user.email ?? '',
    displayName: (session.user.user_metadata?.display_name as string) || '',
    role: normalizeRole(session.user.user_metadata?.role as string),
    emailConfirmed: Boolean(session.user.email_confirmed_at),
  };
  user.emailConfirmed = Boolean(session.user.email_confirmed_at);

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    user,
  };
}

async function fetchProfile(userId: string): Promise<UserInfo | undefined> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,display_name,role')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data) return undefined;
    const row = data as ProfileRow;
    return mapUserInfo({
      id: row.id,
      email: row.email,
      display_name: row.display_name,
      role: row.role,
      emailConfirmed: true,
    });
  } catch {
    return undefined;
  }
}

export const authService = {
  async login(payload: LoginPayload) {
    const { error } = await supabase.auth.signInWithPassword({
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
    });
    if (error) throw new ApiError(error.message, 401);
    const tokens = await sessionToTokens();
    if (!tokens) throw new ApiError('No session', 401);
    return tokens;
  },

  async register(payload: RegisterPayload) {
    const email = payload.email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: payload.password,
      options: {
        data: { display_name: payload.displayName.trim() },
      },
    });
    if (error) throw new ApiError(error.message, 400);
    // If email confirmation required, session may be null.
    if (!data.session) {
      throw new ApiError('Email not verified', 401);
    }
    const tokens = await sessionToTokens();
    if (!tokens) throw new ApiError('No session', 401);
    return tokens;
  },

  async refresh(_refreshToken?: string) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) return null;
    return sessionToTokens();
  },

  async me(): Promise<UserInfo> {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new ApiError('Not authenticated', 401);
    const profile = await fetchProfile(auth.user.id);
    if (profile) {
      profile.emailConfirmed = Boolean(auth.user.email_confirmed_at);
      return profile;
    }
    // Trigger may lag right after signup — fall back to metadata.
    return {
      id: auth.user.id,
      email: auth.user.email ?? '',
      displayName: (auth.user.user_metadata?.display_name as string) || '',
      role: normalizeRole(auth.user.user_metadata?.role as string),
      emailConfirmed: Boolean(auth.user.email_confirmed_at),
    };
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<UserInfo> {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new ApiError('Not authenticated', 401);
    const name = payload.displayName.trim();
    if (name.length < 2) throw new ApiError('Display name must be at least 2 characters', 400);

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: name })
      .eq('id', auth.user.id);
    if (error) throw new ApiError(error.message, 400);

    await supabase.auth.updateUser({ data: { display_name: name } });
    return (await this.me())!;
  },

  async changePassword(payload: ChangePasswordPayload): Promise<Tokens> {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user?.email) throw new ApiError('Not authenticated', 401);

    // Re-auth with current password
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: auth.user.email,
      password: payload.currentPassword,
    });
    if (reauthError) throw new ApiError('Current password is incorrect', 401);

    const { error } = await supabase.auth.updateUser({ password: payload.newPassword });
    if (error) throw new ApiError(error.message, 400);

    const tokens = await sessionToTokens();
    if (!tokens) throw new ApiError('No session', 401);
    return tokens;
  },

  async resendVerification(): Promise<{ email: string }> {
    const { data: auth } = await supabase.auth.getUser();
    const email = auth.user?.email;
    if (!email) throw new ApiError('Not authenticated', 401);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw new ApiError(error.message, 400);
    return { email };
  },

  async logout() {
    await supabase.auth.signOut();
  },

  async getAccessToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  },
};
