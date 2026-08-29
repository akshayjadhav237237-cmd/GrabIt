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
import { AlertIcon, CheckIcon } from '../../components/icons';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { login, isLoading, error: authError, clearError } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'Login'>>();

  const displayedError = localError || authError;

  const handleLogin = async () => {
    clearError();
    setLocalError(null);

    if (!email.trim() || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    await login(email.trim(), password);
  };

  const handleNavigateToSignup = () => {
    clearError();
    setLocalError(null);
    navigation.navigate('Signup');
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
            <Text style={styles.brandTitle}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Why buy when you can borrow? Log in to access trusted community gear.
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
            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View
                style={[
                  styles.inputWrapper,
                  isEmailFocused && styles.inputWrapperFocused,
                ]}
              >
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor={theme.colors.textMuted}
                  underlineColorAndroid="transparent"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setIsEmailFocused(true)}
                  onBlur={() => setIsEmailFocused(false)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Password Field */}
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
                  isPasswordFocused && styles.inputWrapperFocused,
                ]}
              >
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={theme.colors.textMuted}
                  underlineColorAndroid="transparent"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Trust highlights banner */}
            <View style={styles.trustBanner}>
              <View style={styles.trustItem}>
                <CheckIcon size={14} color={theme.colors.primary} />
                <Text style={styles.trustItemText}>Verified Renters</Text>
              </View>
              <View style={styles.trustItem}>
                <CheckIcon size={14} color={theme.colors.primary} />
                <Text style={styles.trustItemText}>Damage Protected</Text>
              </View>
            </View>

            {/* Primary Action Button */}
            <TouchableScale
              style={[
                styles.primaryButton,
                isLoading && styles.primaryButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
              scaleTo={0.96}
            >
              {isLoading ? (
                <ActivityIndicator color={theme.colors.surface} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Log In</Text>
              )}
            </TouchableScale>
          </View>

          {/* Footer Signup Link */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerPrompt}>New to Grabit?</Text>
            <TouchableScale
              onPress={handleNavigateToSignup}
              disabled={isLoading}
              scaleTo={0.95}
              style={styles.signupLink}
            >
              <Text style={styles.signupLinkText}>Create Account</Text>
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
  trustBanner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: theme.spacing.xs,
    borderTopWidth: theme.borderWidth.thin,
    borderBottomWidth: theme.borderWidth.thin,
    borderColor: theme.colors.borderSubtle,
    marginVertical: theme.spacing.xs,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  trustItemText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.fontWeight.medium,
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
  signupLink: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  signupLinkText: {
    color: theme.colors.accent,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
  },
});

export default LoginScreen;

