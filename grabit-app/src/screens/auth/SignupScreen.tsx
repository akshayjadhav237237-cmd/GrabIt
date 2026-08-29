import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TouchableScale } from '../../components/TouchableScale';
import { AlertIcon, ShieldIcon } from '../../components/icons';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';

export const SignupScreen: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const { signup, isLoading, error: authError, clearError } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'Signup'>>();

  const displayedError = localError || authError;

  const handleSignup = async () => {
    clearError();
    setLocalError(null);

    if (!name.trim() || !email.trim() || !password) {
      setLocalError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    await signup(name.trim(), email.trim(), password, referralCode.trim() || undefined);
  };

  const handleNavigateToLogin = () => {
    clearError();
    setLocalError(null);
    navigation.navigate('Login');
  };

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand Header */}
          <View style={styles.headerContainer}>
            <View style={styles.brandBadge}>
              <Text style={styles.brandBadgeText}>Grabit Gear Exchange</Text>
            </View>
            <Text style={styles.brandTitle}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join our local sharing community. Rent gear, save money, and earn from your idle items.
            </Text>
          </View>

          {/* Error Banner */}
          {displayedError ? (
            <View style={styles.errorBanner}>
              <AlertIcon size={18} color={theme.colors.error} style={styles.errorIcon} />
              <Text style={styles.errorText}>{displayedError}</Text>
            </View>
          ) : null}

          {/* Card Form Container */}
          <View style={styles.formCard}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'name' && styles.inputWrapperFocused,
                ]}
              >
                <TextInput
                  style={styles.input}
                  placeholder="Alex Morgan"
                  placeholderTextColor={theme.colors.textMuted}
                  underlineColorAndroid="transparent"
                  value={name}
                  onChangeText={setName}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="words"
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Email Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'email' && styles.inputWrapperFocused,
                ]}
              >
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor={theme.colors.textMuted}
                  underlineColorAndroid="transparent"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Password</Text>
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={theme.opacity.active}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.showPasswordText}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'password' && styles.inputWrapperFocused,
                ]}
              >
                <TextInput
                  style={styles.input}
                  placeholder="At least 6 characters"
                  placeholderTextColor={theme.colors.textMuted}
                  underlineColorAndroid="transparent"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Referral Code (Optional) */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Referral Code</Text>
                <Text style={styles.optionalBadge}>Optional</Text>
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'referral' && styles.inputWrapperFocused,
                ]}
              >
                <TextInput
                  style={styles.input}
                  placeholder="e.g. GRAB-A9B8C7"
                  placeholderTextColor={theme.colors.textMuted}
                  underlineColorAndroid="transparent"
                  value={referralCode}
                  onChangeText={setReferralCode}
                  onFocus={() => setFocusedField('referral')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Community Guarantee Badge */}
            <View style={styles.guaranteeContainer}>
              <ShieldIcon size={16} color={theme.colors.primary} withCheck />
              <Text style={styles.guaranteeText}>
                Free damage coverage and ID verification included on every booking.
              </Text>
            </View>

            {/* Primary Action Button */}
            <TouchableScale
              style={[
                styles.primaryButton,
                isLoading && styles.primaryButtonDisabled,
              ]}
              onPress={handleSignup}
              disabled={isLoading}
              scaleTo={0.96}
            >
              {isLoading ? (
                <ActivityIndicator color={theme.colors.surface} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Create Account</Text>
              )}
            </TouchableScale>
          </View>

          {/* Footer Login Link */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerPrompt}>Already have an account?</Text>
            <TouchableScale
              onPress={handleNavigateToLogin}
              disabled={isLoading}
              scaleTo={0.95}
              style={styles.loginLink}
            >
              <Text style={styles.loginLinkText}>Log In</Text>
            </TouchableScale>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
  },
  headerContainer: {
    marginBottom: theme.spacing.xl,
  },
  brandBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primarySurface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs / 2,
    ...theme.borderRadius.badgeAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.borderSubtle,
    marginBottom: theme.spacing.sm,
  },
  brandBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primaryDark,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  brandTitle: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xxl,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.colors.textSecondary,
  },
  errorBanner: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderColor: theme.colors.error,
    borderWidth: theme.borderWidth.thin,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorIcon: {
    marginRight: theme.spacing.sm,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.sm,
    flex: 1,
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    ...theme.borderRadius.cardAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadows.md,
    marginBottom: theme.spacing.xl,
  },
  inputGroup: {
    gap: theme.spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
  },
  optionalBadge: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textMuted,
  },
  showPasswordText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.accent,
  },
  inputWrapper: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderColor: theme.colors.border,
    borderWidth: theme.borderWidth.thin,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 48,
    justifyContent: 'center',
  },
  inputWrapperFocused: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
  input: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
    lineHeight: theme.typography.lineHeight.md,
    height: '100%',
  },
  guaranteeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySurface,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.borderSubtle,
    gap: theme.spacing.sm,
    marginVertical: theme.spacing.xs,
  },
  guaranteeText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primaryDark,
    fontWeight: theme.typography.fontWeight.medium,
    flex: 1,
    lineHeight: theme.typography.lineHeight.xs,
  },
  primaryButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xs,
    ...theme.shadows.sm,
  },
  primaryButtonDisabled: {
    opacity: theme.opacity.disabled,
  },
  primaryButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.md,
    letterSpacing: 0.3,
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  footerPrompt: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  loginLink: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  loginLinkText: {
    color: theme.colors.accent,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
  },
});

export default SignupScreen;

