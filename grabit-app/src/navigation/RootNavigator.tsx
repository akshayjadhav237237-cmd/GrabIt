import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { AuthProvider, useAuth } from '../context/AuthContext';
import theme from '../theme';

export { useAuth, AuthProvider } from '../context/AuthContext';
export type { AuthContextType } from '../context/AuthContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigatorContent: React.FC = () => {
  const { isAuthenticated, isBootstrapping, hasSeenOnboarding, completeOnboarding } = useAuth();

  if (isBootstrapping) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.brandContainer}>
          <Text style={styles.title}>Grabit</Text>
          <Text style={styles.slogan}>Why own it, when you can Grabit?</Text>
        </View>
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      </View>
    );
  }

  return (
    <NavigationContainer
      theme={{
        dark: false,
        colors: {
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.textPrimary,
          border: theme.colors.border,
          notification: theme.colors.primaryLight,
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
        }}
      >
        {!hasSeenOnboarding ? (
          <Stack.Screen name="Onboarding">
            {() => <OnboardingScreen onFinish={completeOnboarding} />}
          </Stack.Screen>
        ) : !isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <Stack.Screen name="App" component={AppNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export const RootNavigator: React.FC = () => {
  return (
    <AuthProvider>
      <RootNavigatorContent />
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.xl,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.typography.fontSize.hero,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.hero,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  slogan: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  loader: {
    marginTop: theme.spacing.md,
  },
});

export default RootNavigator;
