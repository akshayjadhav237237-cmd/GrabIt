import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import theme from '../../theme';
import { AppStackParamList } from '../../navigation/types';
import { api, BookingItem } from '../../services/api';
import { resolveImageUrl } from '../../utils/imageUrl';
import { formatINR } from '../../utils/currency';
import { SlideToConfirm } from '../../components/SlideToConfirm';
import {
  RazorpayCheckoutModal,
  RazorpayOrderData,
  RazorpayPaymentResult,
} from '../../components/RazorpayCheckoutModal';
import {
  ChevronIcon,
  ShieldIcon,
  CalendarIcon,
  TagIcon,
  CheckIcon,
  BoxIcon,
  CameraIcon,
  DroneIcon,
  PowerToolIcon,
  SpeakerIcon,
  LaptopIcon,
} from '../../components/icons';

type PaymentScreenRouteProp = RouteProp<AppStackParamList, 'Payment'>;

const WALLET_BALANCE = 20000;

const renderCategoryIcon = (category?: string, size = 14, color = theme.colors.textSecondary) => {
  switch (category) {
    case 'Cameras':
      return <CameraIcon size={size} color={color} />;
    case 'Drones':
      return <DroneIcon size={size} color={color} />;
    case 'Power Tools':
      return <PowerToolIcon size={size} color={color} />;
    case 'Event Equipment':
      return <SpeakerIcon size={size} color={color} />;
    case 'Electronics':
      return <LaptopIcon size={size} color={color} />;
    case 'Other':
    default:
      return <BoxIcon size={size} color={color} />;
  }
};

const formatDateRange = (startDateStr: string, endDateStr: string): string => {
  try {
    const s = new Date(startDateStr);
    const e = new Date(endDateStr);
    const sFormatted = s.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
    const eFormatted = e.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${sFormatted} - ${eFormatted}`;
  } catch {
    return `${startDateStr} - ${endDateStr}`;
  }
};

export const PaymentScreen: React.FC = () => {
  const route = useRoute<PaymentScreenRouteProp>();
  const navigation = useNavigation<any>();

  const { bookingId, product, totalDays, pricing, startDate, endDate } = route.params;

  const totalAmount = pricing?.totalAmount ?? 0;
  const isWalletEligible = totalAmount <= WALLET_BALANCE;

  const [selectedMethod, setSelectedMethod] = useState<'wallet' | 'razorpay'>(
    isWalletEligible ? 'wallet' : 'razorpay'
  );

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resetSliderTrigger, setResetSliderTrigger] = useState<number>(0);

  // Razorpay modal states
  const [isRazorpayModalVisible, setIsRazorpayModalVisible] = useState<boolean>(false);
  const [razorpayOrderData, setRazorpayOrderData] = useState<RazorpayOrderData | null>(null);

  const imageUrl = resolveImageUrl(product?.images?.[0]);

  // Navigate to receipt
  const navigateToReceipt = (
    method: 'wallet' | 'razorpay',
    bookingData?: BookingItem,
    transactionId?: string
  ) => {
    navigation.navigate('BookingReceipt', {
      bookingId,
      product,
      totalDays,
      pricing,
      startDate,
      endDate,
      paymentMethod: method,
      paidAt: new Date().toISOString(),
      transactionId,
      booking: bookingData,
    });
  };

  // Wallet payment flow
  const handleWalletPayment = async () => {
    setIsProcessing(true);
    try {
      const res = await api.payWithWallet(bookingId);
      if (res.success && res.data) {
        navigateToReceipt('wallet', res.data);
      } else {
        setIsProcessing(false);
        setResetSliderTrigger((prev) => prev + 1);
        Alert.alert(
          'Wallet Payment Issue',
          res.error || res.message || 'Unable to process wallet payment. Please try again.'
        );
      }
    } catch (err: any) {
      setIsProcessing(false);
      setResetSliderTrigger((prev) => prev + 1);
      Alert.alert(
        'Wallet Payment Error',
        err?.message || 'An unexpected error occurred while paying with wallet.'
      );
    }
  };

  // Razorpay payment initiation
  const handleRazorpayInitiate = async () => {
    setIsProcessing(true);
    try {
      const res = await api.createPaymentOrder(bookingId);
      const orderData = res.success && res.data ? res.data : null;
      const amountInSubunits = orderData?.amount || Math.round(totalAmount * 100);

      setRazorpayOrderData({
        orderId:
          orderData?.orderId ||
          orderData?.id ||
          `order_${bookingId.substring(0, 8)}_${Date.now()}`,
        amount: amountInSubunits,
        currency: orderData?.currency || 'INR',
        keyId: orderData?.keyId || 'rzp_test_GrabitDevKey',
        bookingId,
        productTitle: product?.title || 'Grabit Rental',
      });
      setIsRazorpayModalVisible(true);
    } catch {
      // Fallback test order
      setRazorpayOrderData({
        orderId: `order_${bookingId.substring(0, 8)}_${Date.now()}`,
        amount: Math.round(totalAmount * 100),
        currency: 'INR',
        keyId: 'rzp_test_GrabitDevKey',
        bookingId,
        productTitle: product?.title || 'Grabit Rental',
      });
      setIsRazorpayModalVisible(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // Razorpay verification on success callback
  const handleRazorpaySuccess = async (paymentResult: RazorpayPaymentResult) => {
    setIsRazorpayModalVisible(false);
    setIsProcessing(true);
    try {
      const verifyRes = await api.verifyPayment(bookingId, paymentResult);
      if (verifyRes.success) {
        const bookingData = (verifyRes.data?.booking || verifyRes.data) as BookingItem | undefined;
        navigateToReceipt(
          'razorpay',
          bookingData,
          paymentResult.razorpay_payment_id
        );
      } else {
        setIsProcessing(false);
        setResetSliderTrigger((prev) => prev + 1);
        Alert.alert(
          'Verification Notice',
          verifyRes.error ||
            'Payment was submitted, but status verification is pending. Check your Bookings tab.'
        );
      }
    } catch (err: any) {
      setIsProcessing(false);
      setResetSliderTrigger((prev) => prev + 1);
      Alert.alert(
        'Payment Notice',
        err?.message || 'Payment received. Please check your Bookings tab for status.'
      );
    }
  };

  const handleRazorpayCancel = () => {
    setIsRazorpayModalVisible(false);
    setResetSliderTrigger((prev) => prev + 1);
  };

  const handleRazorpayError = (errMsg: string) => {
    setIsRazorpayModalVisible(false);
    setResetSliderTrigger((prev) => prev + 1);
    Alert.alert('Payment Failed', errMsg || 'Razorpay checkout encountered an issue.');
  };

  // Slider confirmed trigger
  const handleConfirmSlider = () => {
    if (selectedMethod === 'wallet') {
      if (!isWalletEligible) {
        Alert.alert(
          'Insufficient Balance',
          `Grabit Wallet balance (${formatINR(WALLET_BALANCE)}) is less than total amount (${formatINR(totalAmount)}). Please select Razorpay.`
        );
        setResetSliderTrigger((prev) => prev + 1);
        return;
      }
      handleWalletPayment();
    } else {
      handleRazorpayInitiate();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.surface} />

      {/* Top Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={theme.opacity.active}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronIcon size={22} color={theme.colors.textPrimary} direction="left" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Review & Pay</Text>
          <Text style={styles.headerSubtitle}>Complete your booking</Text>
        </View>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Booking Summary Card */}
        <View style={styles.card}>
          <View style={styles.summaryRow}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.productThumbnail} resizeMode="cover" />
            ) : (
              <View style={styles.productThumbnailFallback}>
                {renderCategoryIcon(product?.category, 26, theme.colors.primaryLight)}
              </View>
            )}

            <View style={styles.summaryDetails}>
              <View style={styles.categoryBadge}>
                {renderCategoryIcon(product?.category, 11, theme.colors.primaryDark)}
                <Text style={styles.categoryBadgeText}>{product?.category || 'General'}</Text>
              </View>

              <Text style={styles.productTitle} numberOfLines={2}>
                {product?.title || 'Rental Item'}
              </Text>

              <View style={styles.dateRow}>
                <CalendarIcon size={13} color={theme.colors.textSecondary} />
                <Text style={styles.dateText}>
                  {formatDateRange(startDate, endDate)} ({totalDays} day{totalDays > 1 ? 's' : ''})
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Quick Total Row */}
          <View style={styles.summaryTotalRow}>
            <Text style={styles.summaryTotalLabel}>Total Payable</Text>
            <Text style={styles.summaryTotalValue}>₹{totalAmount.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Pricing Breakdown Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Price Details</Text>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>
              Rental Fee ({totalDays} day{totalDays > 1 ? 's' : ''})
            </Text>
            <Text style={styles.breakdownValue}>
              ₹{(pricing?.rentalFee ?? 0).toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Platform Service Fee</Text>
            <Text style={styles.breakdownValue}>
              ₹{(pricing?.platformFee ?? 0).toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Security Deposit (Refundable)</Text>
            <Text style={styles.breakdownValue}>
              ₹{(pricing?.securityDeposit ?? 0).toLocaleString('en-IN')}
            </Text>
          </View>

          {(pricing?.damageProtectionFee ?? 0) > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Damage Protection Plan</Text>
              <Text style={styles.breakdownValue}>
                ₹{(pricing?.damageProtectionFee ?? 0).toLocaleString('en-IN')}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.breakdownTotalRow}>
            <Text style={styles.breakdownTotalLabel}>Total Amount</Text>
            <Text style={styles.breakdownTotalValue}>₹{totalAmount.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Payment Methods Section */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Select Payment Method</Text>

          {/* Option 1: Grabit Wallet */}
          <TouchableOpacity
            style={[
              styles.paymentOptionCard,
              selectedMethod === 'wallet' && isWalletEligible && styles.paymentOptionSelected,
              !isWalletEligible && styles.paymentOptionDisabled,
            ]}
            onPress={() => {
              if (isWalletEligible) {
                setSelectedMethod('wallet');
              }
            }}
            activeOpacity={isWalletEligible ? theme.opacity.active : 1}
            disabled={!isWalletEligible}
            accessibilityRole="radio"
            accessibilityState={{
              selected: selectedMethod === 'wallet' && isWalletEligible,
              disabled: !isWalletEligible,
            }}
          >
            <View style={styles.optionHeaderRow}>
              <View style={styles.optionRadioOuter}>
                {selectedMethod === 'wallet' && isWalletEligible && (
                  <View style={styles.optionRadioInner} />
                )}
              </View>

              <View style={styles.optionInfo}>
                <Text
                  style={[
                    styles.optionTitle,
                    !isWalletEligible && styles.optionTitleDisabled,
                  ]}
                >
                  Grabit Wallet — {formatINR(WALLET_BALANCE)} available
                </Text>

                {isWalletEligible ? (
                  <Text style={styles.optionSubtext}>
                    Instant 1-swipe payment using your Grabit balance
                  </Text>
                ) : (
                  <Text style={styles.insufficientWarningText}>
                    Insufficient wallet balance ({formatINR(WALLET_BALANCE)} &lt; {formatINR(totalAmount)})
                  </Text>
                )}
              </View>

              <View
                style={[
                  styles.methodBadge,
                  isWalletEligible ? styles.walletBadgeActive : styles.walletBadgeDisabled,
                ]}
              >
                <TagIcon
                  size={12}
                  color={isWalletEligible ? theme.colors.primaryDark : theme.colors.textMuted}
                />
                <Text
                  style={[
                    styles.methodBadgeText,
                    isWalletEligible ? styles.walletBadgeTextActive : styles.walletBadgeTextDisabled,
                  ]}
                >
                  {formatINR(WALLET_BALANCE)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Option 2: Razorpay */}
          <TouchableOpacity
            style={[
              styles.paymentOptionCard,
              selectedMethod === 'razorpay' && styles.paymentOptionSelected,
            ]}
            onPress={() => setSelectedMethod('razorpay')}
            activeOpacity={theme.opacity.active}
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedMethod === 'razorpay' }}
          >
            <View style={styles.optionHeaderRow}>
              <View style={styles.optionRadioOuter}>
                {selectedMethod === 'razorpay' && <View style={styles.optionRadioInner} />}
              </View>

              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Razorpay (Cards, UPI, NetBanking)</Text>
                <Text style={styles.optionSubtext}>
                  Pay securely via UPI (Google Pay, PhonePe, Paytm), Debit/Credit Cards & NetBanking
                </Text>
              </View>

              <View style={styles.razorpayBadge}>
                <CheckIcon size={12} color={theme.colors.primaryLight} />
                <Text style={styles.razorpayBadgeText}>All Modes</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Security & Escrow Protection Notice */}
        <View style={styles.trustBanner}>
          <ShieldIcon size={18} color={theme.colors.primaryDark} />
          <View style={styles.trustBannerTextContainer}>
            <Text style={styles.trustBannerTitle}>Grabit Escrow Protection</Text>
            <Text style={styles.trustBannerBody}>
              Your payment is safely held until you confirm pickup. Security deposits are
              automatically refunded upon safe return.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Confirmation Action */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomTotalRow}>
          <View>
            <Text style={styles.bottomTotalLabel}>Total to Pay</Text>
            <Text style={styles.bottomTotalValue}>₹{totalAmount.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.paymentMethodChip}>
            <Text style={styles.paymentMethodChipText}>
              via {selectedMethod === 'wallet' ? 'Grabit Wallet' : 'Razorpay'}
            </Text>
          </View>
        </View>

        {/* Module 8: Drag-to-Book Slider */}
        <SlideToConfirm
          title="Slide to Confirm Booking »»"
          confirmedTitle="Processing Booking..."
          isLoading={isProcessing}
          disabled={isProcessing}
          resetTrigger={resetSliderTrigger}
          onConfirmed={handleConfirmSlider}
        />
      </View>

      {/* Razorpay WebView Modal */}
      <RazorpayCheckoutModal
        visible={isRazorpayModalVisible}
        orderData={razorpayOrderData}
        onSuccess={handleRazorpaySuccess}
        onCancel={handleRazorpayCancel}
        onError={handleRazorpayError}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: theme.borderWidth.thin,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs / 2,
  },
  headerPlaceholder: {
    width: 36,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    shadowColor: theme.shadows.sm.shadowColor,
    shadowOffset: theme.shadows.sm.shadowOffset,
    shadowOpacity: theme.shadows.sm.shadowOpacity,
    shadowRadius: theme.shadows.sm.shadowRadius,
    elevation: theme.shadows.sm.elevation,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productThumbnail: {
    width: 72,
    height: 72,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceSubtle,
  },
  productThumbnailFallback: {
    width: 72,
    height: 72,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryDetails: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySurface,
    paddingHorizontal: theme.spacing.xs + 2,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.borderRadius.xs,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.xs,
    gap: theme.spacing.xs / 2,
  },
  categoryBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.primaryDark,
  },
  productTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  dateText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
  },
  divider: {
    height: theme.borderWidth.thin,
    backgroundColor: theme.colors.borderSubtle,
    marginVertical: theme.spacing.md,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryTotalLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textSecondary,
  },
  summaryTotalValue: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.lg,
    color: theme.colors.primary,
  },
  cardSectionTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  breakdownLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textSecondary,
  },
  breakdownValue: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
  },
  breakdownTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownTotalLabel: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.colors.textPrimary,
  },
  breakdownTotalValue: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.lg,
    color: theme.colors.primary,
  },
  paymentOptionCard: {
    borderRadius: theme.borderRadius.md,
    borderWidth: theme.borderWidth.regular,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  paymentOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySurface,
  },
  paymentOptionDisabled: {
    opacity: theme.opacity.disabled,
    backgroundColor: theme.colors.surfaceSubtle,
    borderColor: theme.colors.borderSubtle,
  },
  optionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  optionRadioOuter: {
    width: 20,
    height: 20,
    borderRadius: theme.borderRadius.full,
    borderWidth: theme.borderWidth.regular,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
    marginTop: 2,
  },
  optionRadioInner: {
    width: 10,
    height: 10,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary,
  },
  optionInfo: {
    flex: 1,
    marginRight: theme.spacing.xs,
  },
  optionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs / 2,
  },
  optionTitleDisabled: {
    color: theme.colors.textMuted,
  },
  optionSubtext: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
  },
  insufficientWarningText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.error,
    marginTop: theme.spacing.xs / 2,
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs + 2,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.borderRadius.xs,
    gap: theme.spacing.xs / 2,
  },
  walletBadgeActive: {
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.primaryLight,
  },
  walletBadgeDisabled: {
    backgroundColor: theme.colors.surfaceSubtle,
  },
  methodBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xs,
  },
  walletBadgeTextActive: {
    color: theme.colors.primaryDark,
  },
  walletBadgeTextDisabled: {
    color: theme.colors.textMuted,
  },
  razorpayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySurface,
    paddingHorizontal: theme.spacing.xs + 2,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.borderRadius.xs,
    gap: theme.spacing.xs / 2,
  },
  razorpayBadgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.primaryLight,
  },
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.primarySurface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.borderSubtle,
    gap: theme.spacing.sm,
  },
  trustBannerTextContainer: {
    flex: 1,
  },
  trustBannerTitle: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.primaryDark,
    marginBottom: theme.spacing.xs / 2,
  },
  trustBannerBody: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
  },
  bottomBar: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderTopWidth: theme.borderWidth.thin,
    borderTopColor: theme.colors.border,
    shadowColor: theme.shadows.lg.shadowColor,
    shadowOffset: theme.shadows.lg.shadowOffset,
    shadowOpacity: theme.shadows.lg.shadowOpacity,
    shadowRadius: theme.shadows.lg.shadowRadius,
    elevation: theme.shadows.lg.elevation,
  },
  bottomTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  bottomTotalLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textMuted,
  },
  bottomTotalValue: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.lg,
    color: theme.colors.primary,
  },
  paymentMethodChip: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.xs,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
  },
  paymentMethodChipText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
  },
});

export default PaymentScreen;
