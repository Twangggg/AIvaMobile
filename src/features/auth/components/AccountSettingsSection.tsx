import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { authService } from '@/features/auth/auth.service';
import { useAuth } from '@/features/auth/hooks';
import { showError, showSuccess } from '@/shared/utils/toast';
import { alpha } from '@/theme/colors';
import { useAppTheme } from '@/theme/theme';

export function AccountSettingsSection() {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const { tokens, role, setUser, setTokens } = useAuth();
  const user = tokens?.user;

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [resending, setResending] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    void authService
      .me()
      .then((fresh) => {
        setUser(fresh);
        setDisplayName(fresh.displayName ?? '');
      })
      .catch(() => {});
  }, [setUser]);

  const roleLabel =
    role === 'parent' ? t('auth.roleParent') : role === 'admin' ? t('auth.roleAdmin') : t('auth.roleTeacher');

  const onSaveProfile = useCallback(async () => {
    const name = displayName.trim();
    if (name.length < 2) {
      showError(t('account.saveFailed'), t('auth.displayNameMin'));
      return;
    }
    setSavingProfile(true);
    try {
      const fresh = await authService.updateProfile({ displayName: name });
      await setUser(fresh);
      showSuccess(t('account.profileSaved'));
    } catch (e) {
      showError(t('account.saveFailed'), (e as { message?: string })?.message);
    } finally {
      setSavingProfile(false);
    }
  }, [displayName, setUser, t]);

  const onChangePassword = useCallback(async () => {
    if (newPassword.length < 6) {
      showError(t('account.passwordFailed'), t('auth.minChars'));
      return;
    }
    if (newPassword !== confirmPassword) {
      showError(t('account.passwordFailed'), t('account.passwordMismatch'));
      return;
    }
    setSavingPassword(true);
    try {
      const next = await authService.changePassword({
        currentPassword,
        newPassword,
      });
      await setTokens(next);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showSuccess(t('account.passwordChanged'));
    } catch (e) {
      const code = (e as { statusCode?: number })?.statusCode;
      showError(
        t('account.passwordFailed'),
        code === 401 ? t('account.wrongCurrentPassword') : (e as { message?: string })?.message,
      );
    } finally {
      setSavingPassword(false);
    }
  }, [confirmPassword, currentPassword, newPassword, setTokens, t]);

  const onResendVerification = useCallback(async () => {
    setResending(true);
    try {
      await authService.resendVerification();
      showSuccess(t('account.verificationSent'));
    } catch (e) {
      showError(t('account.verificationFailed'), (e as { message?: string })?.message);
    } finally {
      setResending(false);
    }
  }, [t]);

  const fieldStyle = [
    styles.input,
    {
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface2,
      color: theme.colors.text,
    },
  ];

  return (
    <>
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{t('account.title')}</Text>

        <View style={styles.identityRow}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
            <Text style={[styles.avatarLetter, { color: theme.colors.onPrimary }]}>
              {(user?.displayName || user?.email || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.email, { color: theme.colors.text }]} numberOfLines={1}>
              {user?.email || '—'}
            </Text>
            <Text style={[styles.meta, { color: theme.colors.textMuted }]}>{roleLabel}</Text>
          </View>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: user?.emailConfirmed
                  ? alpha(theme.colors.success, 0.15)
                  : alpha(theme.colors.warn, 0.15),
              },
            ]}
          >
            <Text
              style={{
                color: user?.emailConfirmed ? theme.colors.successDeep : theme.colors.warn,
                fontSize: 11,
                fontWeight: '700',
              }}
            >
              {user?.emailConfirmed ? t('account.emailVerified') : t('account.emailUnverified')}
            </Text>
          </View>
        </View>

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t('auth.displayName')}</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          style={fieldStyle}
          placeholder={t('auth.displayName')}
          placeholderTextColor={theme.colors.textMuted}
        />
        <Pressable
          onPress={onSaveProfile}
          disabled={savingProfile}
          style={[
            styles.primaryBtn,
            { backgroundColor: theme.colors.primary, opacity: savingProfile ? 0.6 : 1 },
          ]}
        >
          {savingProfile ? (
            <ActivityIndicator color={theme.colors.onPrimary} />
          ) : (
            <Text style={[styles.primaryBtnLabel, { color: theme.colors.onPrimary }]}>
              {t('account.saveProfile')}
            </Text>
          )}
        </Pressable>
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{t('account.security')}</Text>
        <Text style={[styles.hint, { color: theme.colors.textMuted }]}>{t('account.securityHint')}</Text>

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t('account.currentPassword')}</Text>
        <View style={styles.passRow}>
          <TextInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!showPasswords}
            autoCapitalize="none"
            style={[fieldStyle, { flex: 1 }]}
            placeholder={t('account.currentPassword')}
            placeholderTextColor={theme.colors.textMuted}
          />
          <Pressable onPress={() => setShowPasswords((v) => !v)} hitSlop={8} style={styles.eyeBtn}>
            <Ionicons
              name={showPasswords ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.colors.textMuted}
            />
          </Pressable>
        </View>

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t('account.newPassword')}</Text>
        <TextInput
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showPasswords}
          autoCapitalize="none"
          style={fieldStyle}
          placeholder={t('account.newPassword')}
          placeholderTextColor={theme.colors.textMuted}
        />

        <Text style={[styles.label, { color: theme.colors.textMuted }]}>{t('account.confirmPassword')}</Text>
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showPasswords}
          autoCapitalize="none"
          style={fieldStyle}
          placeholder={t('account.confirmPassword')}
          placeholderTextColor={theme.colors.textMuted}
        />

        <Pressable
          onPress={onChangePassword}
          disabled={savingPassword}
          style={[
            styles.primaryBtn,
            { backgroundColor: theme.colors.accent, opacity: savingPassword ? 0.6 : 1 },
          ]}
        >
          {savingPassword ? (
            <ActivityIndicator color={theme.colors.onAccent} />
          ) : (
            <Text style={[styles.primaryBtnLabel, { color: theme.colors.onAccent }]}>
              {t('account.changePassword')}
            </Text>
          )}
        </Pressable>

        {!user?.emailConfirmed ? (
          <Pressable
            onPress={onResendVerification}
            disabled={resending}
            style={[styles.secondaryBtn, { borderColor: theme.colors.border, opacity: resending ? 0.6 : 1 }]}
          >
            <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
              {resending ? t('account.sending') : t('account.resendVerification')}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: { padding: 18, borderRadius: 24, borderWidth: 1, gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 0.4, marginBottom: 2 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 18, fontWeight: '700' },
  email: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 13 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  label: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  hint: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 14,
    paddingHorizontal: 14,
  },
  passRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eyeBtn: { padding: 10 },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnLabel: { fontSize: 14, fontWeight: '700' },
  secondaryBtn: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
