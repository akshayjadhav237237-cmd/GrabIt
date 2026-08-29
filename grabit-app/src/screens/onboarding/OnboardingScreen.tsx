import React, { useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ListRenderItemInfo,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TouchableScale } from '../../components/TouchableScale';
import { BoxIcon, CameraIcon, ShieldIcon, StarIcon, ChevronIcon } from '../../components/icons';
import theme from '../../theme';

export const ONBOARDING_STORAGE_KEY = 'grabit_onboarding_seen';

export interface OnboardingSlide {
  id: string;
  badge: string;
  title: string;
  description: string;
  iconType: 'box' | 'camera' | 'shield' | 'star';
}

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 'slide-1',
    badge: 'Peer-to-Peer Rentals',
    title: 'Why own it, when you can Grabit?',
    description:
      'Rent cameras, drones, power tools, and event equipment directly from trusted people in your neighborhood.',
    iconType: 'box',
  },
  {
    id: 'slide-2',
    badge: 'Affordable Access',
    title: 'Borrow & Save Big',
    description:
      'Get immediate access to high-value gear for a fraction of retail prices with transparent daily rates.',
    iconType: 'camera',
  },
  {
    id: 'slide-3',
    badge: 'Passive Income',
    title: 'Lend & Earn Securely',
    description:
      'Turn your idle equipment into recurring passive income with comprehensive damage protection backing.',
    iconType: 'shield',
  },
  {
    id: 'slide-4',
    badge: 'Verified & Secure',
    title: 'Safe & Community-Driven',
    description:
      'ID-verified members, secure instant digital checkout, and verified community reviews.',
    iconType: 'star',
  },
];

export interface OnboardingScreenProps {
  onFinish?: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onFinish }) => {
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<OnboardingSlide>>(null);

  const isLastSlide = currentIndex === ONBOARDING_SLIDES.length - 1;

  const handleFinish = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } catch (err) {
      console.warn('[OnboardingScreen] Error saving onboarding state:', err);
    }
    if (onFinish) {
      onFinish();
    }
  }, [onFinish]);

  const handleNext = useCallback(() => {
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      handleFinish();
    }
  }, [currentIndex, handleFinish]);

  const handleSkip = useCallback(() => {
    handleFinish();
  }, [handleFinish]);

  const handleDotPress = useCallback((index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setCurrentIndex(index);
  }, []);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / width);
      if (index >= 0 && index < ONBOARDING_SLIDES.length) {
        setCurrentIndex(index);
      }
    },
    [width]
  );

  const renderSlideIcon = (type: OnboardingSlide['iconType']) => {
    switch (type) {
      case 'box':
        return <BoxIcon size={56} color={theme.colors.primary} strokeWidth={2} />;
      case 'camera':
        return <CameraIcon size={56} color={theme.colors.accent} strokeWidth={2} />;
      case 'shield':
        return <ShieldIcon size={56} color={theme.colors.primary} withCheck strokeWidth={2} />;
      case 'star':
        return <StarIcon size={56} color={theme.colors.accent} filled strokeWidth={2} />;
      default:
        return <BoxIcon size={56} color={theme.colors.primary} strokeWidth={2} />;
    }
  };

  const renderSlide = useCallback(
    ({ item }: ListRenderItemInfo<OnboardingSlide>) => {
      return (
        <View style={[styles.slideContainer, { width }]}>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>

          <View style={styles.iconOuterContainer}>
            <View style={styles.iconInnerContainer}>
              {renderSlideIcon(item.iconType)}
            </View>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.titleText}>{item.title}</Text>
            <Text style={styles.descriptionText}>{item.description}</Text>
          </View>
        </View>
      );
    },
    [width]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <View style={styles.brandContainer}>
          <Text style={styles.brandTitle}>Grabit</Text>
          <View style={styles.brandDot} />
        </View>
        {!isLastSlide ? (
          <TouchableScale
            style={styles.skipHeaderButton}
            onPress={handleSkip}
            scaleTo={0.94}
          >
            <Text style={styles.skipHeaderButtonText}>Skip</Text>
          </TouchableScale>
        ) : (
          <View style={styles.skipHeaderPlaceholder} />
        )}
      </View>

      {/* Swipeable Carousel */}
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        contentContainerStyle={styles.flatListContent}
      />

      {/* Bottom Action Area */}
      <View style={styles.bottomContainer}>
        {/* Pagination Dots */}
        <View style={styles.paginationRow}>
          {ONBOARDING_SLIDES.map((_, index) => {
            const isActive = currentIndex === index;
            return (
              <TouchableScale
                key={`dot-${index}`}
                onPress={() => handleDotPress(index)}
                scaleTo={0.88}
                style={[
                  styles.paginationDot,
                  isActive ? styles.paginationDotActive : styles.paginationDotInactive,
                ]}
              />
            );
          })}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          {!isLastSlide ? (
            <>
              <TouchableScale
                style={styles.secondaryButton}
                onPress={handleSkip}
                scaleTo={0.95}
              >
                <Text style={styles.secondaryButtonText}>Skip</Text>
              </TouchableScale>

              <TouchableScale
                style={styles.primaryButton}
                onPress={handleNext}
                scaleTo={0.96}
              >
                <Text style={styles.primaryButtonText}>Next</Text>
                <ChevronIcon size={16} color={theme.colors.surface} direction="right" />
              </TouchableScale>
            </>
          ) : (
            <TouchableScale
              style={styles.getStartedButton}
              onPress={handleFinish}
              scaleTo={0.96}
            >
              <Text style={styles.getStartedButtonText}>Get Started with Grabit</Text>
            </TouchableScale>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.spacing.xs / 2,
  },
  brandTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xl,
    color: theme.colors.primary,
    letterSpacing: -0.5,
  },
  brandDot: {
    width: 6,
    height: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.accent,
  },
  skipHeaderButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  skipHeaderButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textSecondary,
  },
  skipHeaderPlaceholder: {
    width: theme.spacing.xl,
    height: theme.spacing.md,
  },
  flatListContent: {
    flexGrow: 1,
  },
  slideContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  badgeContainer: {
    backgroundColor: theme.colors.primarySurface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs / 2,
    ...theme.borderRadius.badgeAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.borderSubtle,
    marginBottom: theme.spacing.xl,
  },
  badgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  iconOuterContainer: {
    width: 148,
    height: 148,
    ...theme.borderRadius.cardAsymmetric,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.xxl,
    ...theme.shadows.sm,
  },
  iconInnerContainer: {
    width: 112,
    height: 112,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.borderSubtle,
    ...theme.shadows.md,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  titleText: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xxl,
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  descriptionText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  bottomContainer: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    paddingTop: theme.spacing.md,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.xs,
  },
  paginationDot: {
    height: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  paginationDotActive: {
    width: 28,
    backgroundColor: theme.colors.accent,
  },
  paginationDotInactive: {
    width: theme.spacing.sm,
    backgroundColor: theme.colors.border,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  secondaryButton: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  secondaryButtonText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.colors.textSecondary,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    ...theme.borderRadius.buttonAsymmetric,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  primaryButtonText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.colors.surface,
  },
  getStartedButton: {
    width: '100%',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    ...theme.borderRadius.buttonAsymmetric,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md,
  },
  getStartedButtonText: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.colors.surface,
    letterSpacing: 0.3,
  },
});

export default OnboardingScreen;

