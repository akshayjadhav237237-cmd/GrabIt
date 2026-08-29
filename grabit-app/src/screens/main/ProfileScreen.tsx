import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  Alert,
  Share,
  Switch,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TouchableScale } from '../../components/TouchableScale';
import { useAuth } from '../../context/AuthContext';
import theme from '../../theme';
import { api, ReviewItem, UserEarningsData, resolveImageUrl } from '../../services/api';
import { formatINR } from '../../utils';
import {
  EditIcon,
  ShieldIcon,
  StarIcon,
  CopyIcon,
  ShareIcon,
  HeartIcon,
  CalendarIcon,
  BoxIcon,
  ChevronIcon,
  AlertIcon,
  CloseIcon,
  CameraIcon,
} from '../../components/icons';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, logout, isLoading: isAuthLoading, updateUser } = useAuth();

  const targetUserId = route.params?.userId;
  const currentUserId = user?.id || (user as any)?._id;
  const isOwnProfile = !targetUserId || targetUserId === currentUserId;

  const [targetUser, setTargetUser] = useState<any>(null);
  const displayName = isOwnProfile
    ? user?.displayName || user?.name || 'Grabit User'
    : targetUser?.displayName || targetUser?.name || 'Community Member';
  const displayEmail = isOwnProfile
    ? user?.email || 'user@example.com'
    : 'Verified Community Member';
  const avatarUrl = isOwnProfile ? user?.avatarUrl : targetUser?.avatarUrl;
  const initial = (displayName.charAt(0) || 'U').toUpperCase();

  // Reviews State
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [averageRating, setAverageRating] = useState<number>(4.8);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [isLoadingReviews, setIsLoadingReviews] = useState<boolean>(false);

  // User Verification State
  const [verificationStatus, setVerificationStatus] = useState<string>(
    user?.verificationStatus || (user?.isVerified ? 'verified' : 'unverified')
  );
  const [isUploadingId, setIsUploadingId] = useState<boolean>(false);

  // Notification Preferences State
  const [bookingUpdatesEnabled, setBookingUpdatesEnabled] = useState<boolean>(
    user?.notificationPrefs?.bookingUpdates !== false
  );
  const [chatMessagesEnabled, setChatMessagesEnabled] = useState<boolean>(
    user?.notificationPrefs?.chatMessages !== false
  );
  const [isUpdatingPrefs, setIsUpdatingPrefs] = useState<boolean>(false);

  // Earnings Summary State
  const [earnings, setEarnings] = useState<UserEarningsData | null>(null);
  const [isLoadingEarnings, setIsLoadingEarnings] = useState<boolean>(false);

  // My Listings State
  const [myListingsCount, setMyListingsCount] = useState<number>(0);

  // Edit Profile Modal State
  const [isEditModalVisible, setIsEditModalVisible] = useState<boolean>(false);
  const [editDisplayName, setEditDisplayName] = useState<string>(displayName);
  const [editPhoneNumber, setEditPhoneNumber] = useState<string>(user?.phoneNumber || '');
  const [editAvatarUri, setEditAvatarUri] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Report User States
  const [isReportModalVisible, setIsReportModalVisible] = useState<boolean>(false);
  const [selectedReportReason, setSelectedReportReason] = useState<
    'Spam' | 'Inappropriate' | 'Scam/Fraud' | 'Other'
  >('Spam');
  const [reportDetails, setReportDetails] = useState<string>('');
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Referral Code State
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const handleCopyReferralCode = async () => {
    const code = user?.referralCode || 'GRAB-A9B8C7';
    try {
      if (typeof navigator !== 'undefined' && (navigator as any)?.clipboard?.writeText) {
        await (navigator as any).clipboard.writeText(code);
      }
    } catch {
      // safe fallback
    }
    setCopiedCode(true);
    setTimeout(() => {
      setCopiedCode(false);
    }, 2500);
  };

  const handleShareReferralCode = async () => {
    const code = user?.referralCode || 'GRAB-A9B8C7';
    try {
      await Share.share({
        message: `Invite friends to Grabit — Share your code! Use my referral code ${code} when signing up for Grabit.`,
      });
    } catch {
      // safe fallback
    }
  };

  // Fetch Reviews
  const fetchReviews = useCallback(async () => {
    const userIdToFetch = targetUserId || currentUserId;
    if (!userIdToFetch) return;

    setIsLoadingReviews(true);
    try {
      const res = await api.getUserReviews(userIdToFetch);
      if (res.success && res.data) {
        const reviewList = res.data.reviews || [];
        setReviews(reviewList);
        setAverageRating(res.data.averageRating || (reviewList.length > 0 ? 4.8 : 5.0));
        setTotalReviews(res.data.totalReviews || reviewList.length);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingReviews(false);
    }
  }, [targetUserId, currentUserId]);

  // Fetch Earnings Summary (Own profile only)
  const fetchEarnings = useCallback(async () => {
    if (!isOwnProfile) return;
    setIsLoadingEarnings(true);
    try {
      const res = await api.getEarnings();
      if (res.success && res.data) {
        setEarnings(res.data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingEarnings(false);
    }
  }, [isOwnProfile]);

  // Fetch My Listings Count (Own profile only)
  const fetchMyListingsCount = useCallback(async () => {
    if (!isOwnProfile) return;
    try {
      const res = await api.getMyProducts();
      if (res.success && Array.isArray(res.data)) {
        setMyListingsCount(res.data.length);
      }
    } catch {
      // ignore
    }
  }, [isOwnProfile]);

  useFocusEffect(
    useCallback(() => {
      fetchReviews();
      if (isOwnProfile) {
        fetchEarnings();
        fetchMyListingsCount();
      }
    }, [fetchReviews, fetchEarnings, fetchMyListingsCount, isOwnProfile])
  );

  useEffect(() => {
    if (isOwnProfile && user) {
      setEditDisplayName(user.displayName || user.name || '');
      setEditPhoneNumber(user.phoneNumber || '');
      const statusFromUser = user.verification?.status || user.verificationStatus;
      if (statusFromUser) {
        setVerificationStatus(statusFromUser);
      } else if (user.isVerified) {
        setVerificationStatus('verified');
      }
      if (user.notificationPrefs) {
        if (user.notificationPrefs.bookingUpdates !== undefined) {
          setBookingUpdatesEnabled(user.notificationPrefs.bookingUpdates !== false);
        }
        if (user.notificationPrefs.chatMessages !== undefined) {
          setChatMessagesEnabled(user.notificationPrefs.chatMessages !== false);
        }
      }
    }
  }, [isOwnProfile, user]);

  // Notification Preferences Toggles
  const handleToggleBookingUpdates = async (newValue: boolean) => {
    setBookingUpdatesEnabled(newValue);
    updateUser?.({
      notificationPrefs: {
        ...(user?.notificationPrefs || {}),
        bookingUpdates: newValue,
        chatMessages: chatMessagesEnabled,
      },
    });

    try {
      setIsUpdatingPrefs(true);
      const res = await api.updateNotificationPrefs({
        bookingUpdates: newValue,
      });
      if (res.success && res.data) {
        updateUser?.({
          notificationPrefs: {
            bookingUpdates: res.data.bookingUpdates !== false,
            chatMessages: res.data.chatMessages !== false,
          },
        });
      } else if (!res.success) {
        // Revert on failure
        setBookingUpdatesEnabled(!newValue);
        updateUser?.({
          notificationPrefs: {
            ...(user?.notificationPrefs || {}),
            bookingUpdates: !newValue,
          },
        });
        Alert.alert('Update Failed', res.error || 'Failed to update notification preferences.');
      }
    } catch (err: any) {
      setBookingUpdatesEnabled(!newValue);
      Alert.alert('Update Error', err.message || 'Failed to update preferences.');
    } finally {
      setIsUpdatingPrefs(false);
    }
  };

  const handleToggleChatMessages = async (newValue: boolean) => {
    setChatMessagesEnabled(newValue);
    updateUser?.({
      notificationPrefs: {
        ...(user?.notificationPrefs || {}),
        bookingUpdates: bookingUpdatesEnabled,
        chatMessages: newValue,
      },
    });

    try {
      setIsUpdatingPrefs(true);
      const res = await api.updateNotificationPrefs({
        chatMessages: newValue,
      });
      if (res.success && res.data) {
        updateUser?.({
          notificationPrefs: {
            bookingUpdates: res.data.bookingUpdates !== false,
            chatMessages: res.data.chatMessages !== false,
          },
        });
      } else if (!res.success) {
        // Revert on failure
        setChatMessagesEnabled(!newValue);
        updateUser?.({
          notificationPrefs: {
            ...(user?.notificationPrefs || {}),
            chatMessages: !newValue,
          },
        });
        Alert.alert('Update Failed', res.error || 'Failed to update notification preferences.');
      }
    } catch (err: any) {
      setChatMessagesEnabled(!newValue);
      Alert.alert('Update Error', err.message || 'Failed to update preferences.');
    } finally {
      setIsUpdatingPrefs(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  // Identity Verification Document Upload
  const handleUploadIdDocument = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Permission to access photos is needed to upload your identity document.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        const docUri = result.assets[0].uri;
        setIsUploadingId(true);
        const res = await api.verifyUser(docUri);
        if (res.success) {
          setVerificationStatus('pending');
          const updatedVerification = res.data?.verification || { status: 'pending' };
          updateUser?.({
            verificationStatus: 'pending',
            verification: updatedVerification,
          });
          Alert.alert(
            'Document Uploaded',
            'Your identity document was uploaded successfully and is now pending review.'
          );
        } else {
          Alert.alert('Upload Failed', res.error || 'Failed to upload document. Please try again.');
        }
      }
    } catch (err: any) {
      Alert.alert('Upload Error', err.message || 'An unexpected error occurred.');
    } finally {
      setIsUploadingId(false);
    }
  };

  // Change Profile Photo
  const handlePickAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Permission to access photos is needed to choose a profile photo.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setEditAvatarUri(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Photo Error', err.message || 'Failed to select photo.');
    }
  };

  // Save Profile Changes
  const handleSaveProfile = async () => {
    if (!editDisplayName.trim()) {
      setProfileError('Display name cannot be empty.');
      return;
    }

    setIsSavingProfile(true);
    setProfileError(null);
    try {
      const updateData: { displayName?: string; phoneNumber?: string; avatarUri?: string } = {
        displayName: editDisplayName.trim(),
        phoneNumber: editPhoneNumber.trim() || undefined,
      };
      if (editAvatarUri) {
        updateData.avatarUri = editAvatarUri;
      }

      const res = await api.updateProfile(updateData);
      if (res.success) {
        updateUser?.({
          displayName: editDisplayName.trim(),
          phoneNumber: editPhoneNumber.trim(),
          avatarUrl: editAvatarUri || user?.avatarUrl,
        });
        setIsEditModalVisible(false);
        Alert.alert('Profile Updated', 'Your profile details have been saved successfully.');
      } else {
        setProfileError(res.error || 'Failed to update profile. Please try again.');
      }
    } catch (err: any) {
      setProfileError(err.message || 'An unexpected error occurred while saving profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Report User
  const handleOpenReportModal = () => {
    setSelectedReportReason('Spam');
    setReportDetails('');
    setReportError(null);
    setIsReportModalVisible(true);
  };

  const handleSubmitReport = async () => {
    const targetId = targetUserId;
    if (!targetId) return;

    setIsSubmittingReport(true);
    setReportError(null);
    try {
      const res = await api.createReport({
        targetType: 'user',
        targetId,
        reason: selectedReportReason,
        details: reportDetails.trim() || undefined,
      });

      if (res.success) {
        setIsReportModalVisible(false);
        Alert.alert(
          'Report Submitted',
          'Thank you for reporting. Our safety team will review this user.'
        );
      } else {
        setReportError(res.error || 'Failed to submit report. Please try again.');
      }
    } catch (err: any) {
      setReportError(err.message || 'An unexpected error occurred while submitting your report.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Back navigation button when viewing another user */}
        {!isOwnProfile && (
          <TouchableScale
            style={styles.backNavButton}
            onPress={() => navigation.goBack()}
          >
            <ChevronIcon direction="left" size={16} color={theme.colors.primary} style={styles.backNavIcon} />
            <Text style={styles.backNavText}>Back</Text>
          </TouchableScale>
        )}

        <View style={styles.headerContainer}>
          <Text style={styles.title}>{isOwnProfile ? 'Profile' : 'User Profile'}</Text>
          <Text style={styles.subtitle}>
            {isOwnProfile
              ? 'Manage your account and rentals'
              : 'Community Member Details & Feedback'}
          </Text>
        </View>

        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          {avatarUrl || editAvatarUri ? (
            <Image
              source={{ uri: resolveImageUrl(editAvatarUri || avatarUrl) || (editAvatarUri || avatarUrl) }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          )}

          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userEmail}>{displayEmail}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>Rentals</Text>
            </View>
            <TouchableScale
              style={styles.statItem}
              onPress={() => isOwnProfile && navigation.navigate('MyListings')}
              disabled={!isOwnProfile}
            >
              <Text style={styles.statNumber}>{myListingsCount}</Text>
              <Text style={styles.statLabel}>Listings</Text>
            </TouchableScale>
            <View style={styles.statItem}>
              <View style={styles.ratingRow}>
                <StarIcon size={16} color={theme.colors.accent} filled style={styles.ratingStarIcon} />
                <Text style={styles.statNumber}>{averageRating > 0 ? averageRating.toFixed(1) : '5.0'}</Text>
              </View>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>

          {/* Edit Profile Button (Own Profile) */}
          {isOwnProfile && (
            <TouchableScale
              style={styles.editProfileButton}
              onPress={() => {
                setEditDisplayName(user?.displayName || user?.name || '');
                setEditPhoneNumber(user?.phoneNumber || '');
                setEditAvatarUri(null);
                setProfileError(null);
                setIsEditModalVisible(true);
              }}
            >
              <EditIcon size={15} color={theme.colors.textPrimary} style={styles.buttonInlineIcon} />
              <Text style={styles.editProfileButtonText}>Edit Profile</Text>
            </TouchableScale>
          )}

          {/* Report User Button (Other user's profile only) */}
          {!isOwnProfile && (
            <TouchableScale
              style={styles.reportUserButton}
              onPress={handleOpenReportModal}
            >
              <AlertIcon size={15} color={theme.colors.error} variant="triangle" style={styles.buttonInlineIcon} />
              <Text style={styles.reportUserButtonText}>Report User</Text>
            </TouchableScale>
          )}
        </View>

        {/* Earnings Summary Card (Own profile only) */}
        {isOwnProfile && (
          <View style={styles.earningsCard}>
            <View style={styles.earningsHeader}>
              <Text style={styles.sectionHeading}>Earnings Summary</Text>
              {isLoadingEarnings && (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              )}
            </View>

            <View style={styles.earningsGrid}>
              <View style={styles.earningsColumn}>
                <Text style={styles.earningsValuePrimary}>
                  {formatINR(earnings?.totalEarned)}
                </Text>
                <Text style={styles.earningsLabel}>Total Earned</Text>
              </View>

              <View style={styles.earningsDivider} />

              <View style={styles.earningsColumn}>
                <Text style={styles.earningsValueWarning}>
                  {formatINR(earnings?.pendingPayout)}
                </Text>
                <Text style={styles.earningsLabel}>Pending Payout</Text>
              </View>

              <View style={styles.earningsDivider} />

              <View style={styles.earningsColumn}>
                <Text style={styles.earningsValue}>
                  {typeof earnings?.completedRentalsCount === 'number' && !isNaN(earnings.completedRentalsCount)
                    ? earnings.completedRentalsCount
                    : 0}
                </Text>
                <Text style={styles.earningsLabel}>Completed Rentals</Text>
              </View>
            </View>
          </View>
        )}

        {/* Identity Verification Section (Own profile only) */}
        {isOwnProfile && (
          <View style={styles.verificationCard}>
            <View style={styles.verificationHeader}>
              <View style={styles.verificationTitleRow}>
                <ShieldIcon size={20} color={theme.colors.primary} withCheck style={styles.shieldIcon} />
                <Text style={styles.sectionHeading}>Identity Verification</Text>
              </View>

              {verificationStatus === 'verified' && (
                <View style={styles.badgeVerified}>
                  <Text style={styles.badgeVerifiedText}>Verified</Text>
                </View>
              )}
              {verificationStatus === 'pending' && (
                <View style={styles.badgePending}>
                  <Text style={styles.badgePendingText}>Pending</Text>
                </View>
              )}
              {(verificationStatus === 'unverified' || verificationStatus === 'rejected') && (
                <View style={styles.badgeUnverified}>
                  <Text style={styles.badgeUnverifiedText}>
                    {verificationStatus === 'rejected' ? 'Rejected' : 'Unverified'}
                  </Text>
                </View>
              )}
            </View>

            {verificationStatus === 'verified' && (
              <Text style={styles.verificationExplanation}>
                Your identity has been verified. You enjoy full trusted community privileges as a verified lender and renter.
              </Text>
            )}

            {verificationStatus === 'pending' && (
              <Text style={styles.verificationExplanation}>
                Your document has been submitted and is currently pending review by our safety team. Verification takes 24-48 hours.
              </Text>
            )}

            {(verificationStatus === 'unverified' || verificationStatus === 'rejected') && (
              <View>
                <Text style={styles.verificationExplanation}>
                  Verify your identity with a government-issued photo ID (driver's license or passport) to build community trust and unlock verified badge benefits.
                </Text>
                <TouchableScale
                  style={[styles.uploadIdButton, isUploadingId && styles.uploadIdButtonDisabled]}
                  onPress={handleUploadIdDocument}
                  disabled={isUploadingId}
                >
                  {isUploadingId ? (
                    <ActivityIndicator size="small" color={theme.colors.surface} />
                  ) : (
                    <View style={styles.buttonContentRow}>
                      <CameraIcon size={16} color={theme.colors.surface} style={styles.buttonInlineIcon} />
                      <Text style={styles.uploadIdButtonText}>Upload ID Document</Text>
                    </View>
                  )}
                </TouchableScale>
              </View>
            )}
          </View>
        )}

        {/* Quick Navigation Menu (Own profile only) */}
        {isOwnProfile && (
          <View style={styles.menuCard}>
            <TouchableScale
              style={styles.menuRow}
              onPress={() => navigation.navigate('MyListings')}
            >
              <View style={styles.menuLeft}>
                <View style={styles.menuIconBox}>
                  <BoxIcon size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>My Listings</Text>
                  <Text style={styles.menuSubtitle}>{myListingsCount} listed {myListingsCount === 1 ? 'item' : 'items'}</Text>
                </View>
              </View>
              <ChevronIcon direction="right" size={20} color={theme.colors.textMuted} />
            </TouchableScale>

            <View style={styles.menuDivider} />

            <TouchableScale
              style={styles.menuRow}
              onPress={() => navigation.navigate('Bookings')}
            >
              <View style={styles.menuLeft}>
                <View style={styles.menuIconBox}>
                  <CalendarIcon size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>My Bookings & Rentals</Text>
                  <Text style={styles.menuSubtitle}>View incoming and outgoing rental requests</Text>
                </View>
              </View>
              <ChevronIcon direction="right" size={20} color={theme.colors.textMuted} />
            </TouchableScale>

            <View style={styles.menuDivider} />

            <TouchableScale
              style={styles.menuRow}
              onPress={() => navigation.navigate('Wishlist')}
            >
              <View style={styles.menuLeft}>
                <View style={styles.menuIconBox}>
                  <HeartIcon size={20} color={theme.colors.accent} filled />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>Saved Items (Wishlist)</Text>
                  <Text style={styles.menuSubtitle}>View and manage your saved gear and listings</Text>
                </View>
              </View>
              <ChevronIcon direction="right" size={20} color={theme.colors.textMuted} />
            </TouchableScale>
          </View>
        )}

        {/* Notification Settings Card (Own profile only) */}
        {isOwnProfile && (
          <View style={styles.notificationSettingsCard}>
            <View style={styles.notificationSettingsHeader}>
              <Text style={styles.sectionHeading}>Notification Settings</Text>
              <Text style={styles.notificationSettingsSubtitle}>
                Choose what notifications you receive via push
              </Text>
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleTitle}>Booking Updates</Text>
                <Text style={styles.toggleDescription}>
                  Instant alerts for booking confirmations, cancellations, and status changes
                </Text>
              </View>
              <Switch
                value={bookingUpdatesEnabled}
                onValueChange={handleToggleBookingUpdates}
                disabled={isUpdatingPrefs}
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.primaryLight,
                }}
                thumbColor={
                  bookingUpdatesEnabled ? theme.colors.primary : theme.colors.surfaceSubtle
                }
                ios_backgroundColor={theme.colors.border}
              />
            </View>

            <View style={[styles.toggleRow, styles.toggleRowBorder]}>
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleTitle}>Chat Messages</Text>
                <Text style={styles.toggleDescription}>
                  Direct push notifications when someone sends you a message for a booking
                </Text>
              </View>
              <Switch
                value={chatMessagesEnabled}
                onValueChange={handleToggleChatMessages}
                disabled={isUpdatingPrefs}
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.primaryLight,
                }}
                thumbColor={
                  chatMessagesEnabled ? theme.colors.primary : theme.colors.surfaceSubtle
                }
                ios_backgroundColor={theme.colors.border}
              />
            </View>
          </View>
        )}

        {/* Referral Program Card (Own profile only) */}
        {isOwnProfile && (
          <View style={styles.referralCard}>
            <View style={styles.referralHeaderRow}>
              <View style={styles.referralHeaderLeft}>
                <View style={styles.referralIconBox}>
                  <ShareIcon size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.referralHeaderTextContainer}>
                  <Text style={styles.referralTitle}>Referral Program</Text>
                  <Text style={styles.referralSlogan}>Invite friends to Grabit — Share your code!</Text>
                </View>
              </View>
            </View>

            <View style={styles.referralCodeBox}>
              <View style={styles.codeTextContainer}>
                <Text style={styles.codeLabel}>YOUR REFERRAL CODE</Text>
                <Text style={styles.codeValue}>{user?.referralCode || 'GRAB-A9B8C7'}</Text>
              </View>
              <TouchableScale
                style={[styles.copyButton, copiedCode && styles.copyButtonActive]}
                onPress={handleCopyReferralCode}
              >
                <CopyIcon size={14} color={copiedCode ? theme.colors.surface : theme.colors.primaryDark} style={styles.buttonInlineIcon} />
                <Text style={[styles.copyButtonText, copiedCode && styles.copyButtonTextActive]}>
                  {copiedCode ? 'Copied' : 'Copy Code'}
                </Text>
              </TouchableScale>
            </View>

            <TouchableScale
              style={styles.shareButton}
              onPress={handleShareReferralCode}
            >
              <ShareIcon size={16} color={theme.colors.surface} style={styles.buttonInlineIcon} />
              <Text style={styles.shareButtonText}>Share Code</Text>
            </TouchableScale>
          </View>
        )}

        {/* Ratings & Reviews Section */}
        <View style={styles.reviewsCard}>
          <View style={styles.reviewsHeaderRow}>
            <Text style={styles.sectionHeading}>Ratings & Reviews</Text>
            <View style={styles.ratingSummaryChip}>
              <StarIcon size={14} color={theme.colors.accent} filled style={styles.ratingSummaryStar} />
              <Text style={styles.ratingSummaryScore}>{averageRating > 0 ? averageRating.toFixed(1) : '4.8'}</Text>
              <Text style={styles.ratingSummaryCount}>({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})</Text>
            </View>
          </View>

          {isLoadingReviews ? (
            <View style={styles.reviewLoadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.reviewLoadingText}>Loading reviews...</Text>
            </View>
          ) : reviews.length === 0 ? (
            <View style={styles.noReviewsBox}>
              <Text style={styles.noReviewsText}>
                No reviews yet. {isOwnProfile ? 'Complete rentals to build your rating score.' : 'This member has not received reviews yet.'}
              </Text>
            </View>
          ) : (
            <View style={styles.reviewsList}>
              {reviews.map((rev, index) => {
                const reviewerObj = typeof rev.reviewer === 'object' ? rev.reviewer : null;
                const reviewerName = reviewerObj?.displayName || reviewerObj?.name || 'Grabit Member';
                const reviewerInitial = (reviewerName.charAt(0) || 'U').toUpperCase();
                const reviewDate = rev.createdAt
                  ? new Date(rev.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Recent';

                return (
                  <View key={rev._id || rev.id || `rev-${index}`} style={styles.reviewItemContainer}>
                    <View style={styles.reviewerHeader}>
                      {reviewerObj?.avatarUrl ? (
                        <Image
                          source={{ uri: resolveImageUrl(reviewerObj.avatarUrl) || reviewerObj.avatarUrl }}
                          style={styles.reviewerAvatarImage}
                        />
                      ) : (
                        <View style={styles.reviewerAvatarBox}>
                          <Text style={styles.reviewerAvatarText}>{reviewerInitial}</Text>
                        </View>
                      )}
                      <View style={styles.reviewerInfo}>
                        <Text style={styles.reviewerName}>{reviewerName}</Text>
                        <View style={styles.reviewRatingRow}>
                          <View style={styles.starsGroup}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <StarIcon
                                key={`rev-star-${s}`}
                                size={12}
                                color={s <= (rev.rating || 5) ? theme.colors.accent : theme.colors.border}
                                filled={s <= (rev.rating || 5)}
                              />
                            ))}
                          </View>
                          <Text style={styles.reviewDateText}>• {reviewDate}</Text>
                        </View>
                      </View>
                    </View>

                    {Boolean(rev.comment) && (
                      <Text style={styles.reviewCommentText}>{rev.comment}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Log Out Button (Own Profile) */}
        {isOwnProfile && (
          <TouchableScale
            style={[styles.authButton, isAuthLoading && styles.authButtonDisabled]}
            onPress={handleLogout}
            disabled={isAuthLoading}
          >
            {isAuthLoading ? (
              <ActivityIndicator color={theme.colors.error} size="small" />
            ) : (
              <Text style={styles.authButtonText}>Log Out</Text>
            )}
          </TouchableScale>
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableScale
            style={styles.modalBackdrop}
            onPress={() => setIsEditModalVisible(false)}
          />

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableScale
                style={styles.modalCloseButton}
                onPress={() => setIsEditModalVisible(false)}
              >
                <CloseIcon size={20} color={theme.colors.textSecondary} />
              </TouchableScale>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              {/* Avatar Photo Preview & Change Photo */}
              <View style={styles.avatarEditContainer}>
                {editAvatarUri || user?.avatarUrl ? (
                  <Image
                    source={{
                      uri:
                        resolveImageUrl(editAvatarUri || user?.avatarUrl) ||
                        (editAvatarUri || user?.avatarUrl),
                    }}
                    style={styles.avatarEditPreview}
                  />
                ) : (
                  <View style={styles.avatarEditPlaceholder}>
                    <Text style={styles.avatarEditText}>{initial}</Text>
                  </View>
                )}
                <TouchableScale
                  style={styles.changePhotoButton}
                  onPress={handlePickAvatar}
                >
                  <CameraIcon size={14} color={theme.colors.textPrimary} style={styles.buttonInlineIcon} />
                  <Text style={styles.changePhotoButtonText}>Change Photo</Text>
                </TouchableScale>
              </View>

              {/* Display Name Input */}
              <Text style={styles.inputLabel}>Display Name</Text>
              <TextInput
                style={styles.textInput}
                value={editDisplayName}
                onChangeText={setEditDisplayName}
                placeholder="Enter your name"
                placeholderTextColor={theme.colors.textMuted}
                underlineColorAndroid="transparent"
              />

              {/* Phone Number Input */}
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.textInput}
                value={editPhoneNumber}
                onChangeText={setEditPhoneNumber}
                placeholder="+1 (555) 000-0000"
                placeholderTextColor={theme.colors.textMuted}
                underlineColorAndroid="transparent"
                keyboardType="phone-pad"
              />

              {Boolean(profileError) && (
                <View style={styles.modalErrorBox}>
                  <Text style={styles.modalErrorText}>{profileError}</Text>
                </View>
              )}

              {/* Save Changes Button */}
              <TouchableScale
                style={[styles.saveProfileButton, isSavingProfile && styles.saveProfileButtonDisabled]}
                onPress={handleSaveProfile}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? (
                  <ActivityIndicator size="small" color={theme.colors.surface} />
                ) : (
                  <Text style={styles.saveProfileButtonText}>Save Changes</Text>
                )}
              </TouchableScale>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Report User Modal */}
      <Modal
        visible={isReportModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableScale
            style={styles.modalBackdrop}
            onPress={() => setIsReportModalVisible(false)}
          />

          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleBox}>
                <Text style={styles.modalTitle}>Report User</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>
                  {displayName}
                </Text>
              </View>
              <TouchableScale
                style={styles.modalCloseButton}
                onPress={() => setIsReportModalVisible(false)}
              >
                <CloseIcon size={20} color={theme.colors.textSecondary} />
              </TouchableScale>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <Text style={styles.modalSectionTitle}>Reason for Report</Text>
              <View style={styles.reportReasonRow}>
                {(['Spam', 'Inappropriate', 'Scam/Fraud', 'Other'] as const).map((reason) => {
                  const isSelected = selectedReportReason === reason;
                  return (
                    <TouchableScale
                      key={reason}
                      style={[styles.reportReasonChip, isSelected && styles.reportReasonChipActive]}
                      onPress={() => setSelectedReportReason(reason)}
                    >
                      <Text style={[styles.reportReasonText, isSelected && styles.reportReasonTextActive]}>
                        {reason}
                      </Text>
                    </TouchableScale>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Additional Details (optional)</Text>
              <TextInput
                style={styles.reportDetailsInput}
                placeholder="Provide details about why you are reporting this user..."
                placeholderTextColor={theme.colors.textMuted}
                underlineColorAndroid="transparent"
                value={reportDetails}
                onChangeText={setReportDetails}
                multiline
                numberOfLines={3}
              />

              {Boolean(reportError) && (
                <View style={styles.modalErrorBox}>
                  <Text style={styles.modalErrorText}>{reportError}</Text>
                </View>
              )}

              <TouchableScale
                style={[
                  styles.submitReportButton,
                  isSubmittingReport && styles.submitReportButtonDisabled,
                ]}
                onPress={handleSubmitReport}
                disabled={isSubmittingReport}
              >
                {isSubmittingReport ? (
                  <ActivityIndicator size="small" color={theme.colors.surface} />
                ) : (
                  <Text style={styles.submitReportButtonText}>Submit Report</Text>
                )}
              </TouchableScale>

              <TouchableScale
                style={styles.cancelReportButton}
                onPress={() => setIsReportModalVisible(false)}
                disabled={isSubmittingReport}
              >
                <Text style={styles.cancelReportButtonText}>Cancel</Text>
              </TouchableScale>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing.xxl,
  },
  backNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  backNavIcon: {
    marginRight: 4,
  },
  backNavText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.primary,
  },
  headerContainer: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xxl,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.colors.textSecondary,
  },
  profileCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    ...theme.borderRadius.cardAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  avatarPlaceholder: {
    width: theme.spacing.xxl + 20,
    height: theme.spacing.xxl + 20,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primarySurface,
    borderWidth: 2.5,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  avatarImage: {
    width: theme.spacing.xxl + 20,
    height: theme.spacing.xxl + 20,
    borderRadius: theme.borderRadius.full,
    borderWidth: 2.5,
    borderColor: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  avatarText: {
    fontSize: theme.typography.fontSize.xl + 2,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primaryDark,
  },
  userName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.lg,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: theme.spacing.md,
    borderTopWidth: theme.borderWidth.thin,
    borderTopColor: theme.colors.borderSubtle,
  },
  statItem: {
    alignItems: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingStarIcon: {
    marginRight: 3,
  },
  statNumber: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.xs + 2,
    paddingHorizontal: theme.spacing.md,
    ...theme.borderRadius.buttonAsymmetric,
  },
  buttonInlineIcon: {
    marginRight: theme.spacing.xs,
  },
  buttonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editProfileButtonText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textPrimary,
  },
  verificationCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    ...theme.borderRadius.cardAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  verificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  verificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shieldIcon: {
    marginRight: theme.spacing.xs,
  },
  sectionHeading: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.colors.textPrimary,
  },
  badgeVerified: {
    backgroundColor: theme.colors.primarySurface,
    paddingVertical: theme.spacing.xs / 2,
    paddingHorizontal: theme.spacing.sm,
    ...theme.borderRadius.badgeAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.primary,
  },
  badgeVerifiedText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primaryDark,
  },
  badgePending: {
    backgroundColor: theme.colors.accentTint,
    paddingVertical: theme.spacing.xs / 2,
    paddingHorizontal: theme.spacing.sm,
    ...theme.borderRadius.badgeAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.statusPending,
  },
  badgePendingText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.statusPending,
  },
  badgeUnverified: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingVertical: theme.spacing.xs / 2,
    paddingHorizontal: theme.spacing.sm,
    ...theme.borderRadius.badgeAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
  },
  badgeUnverifiedText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textSecondary,
  },
  verificationExplanation: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs + 3,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  uploadIdButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm + 2,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xs,
    ...theme.shadows.sm,
  },
  uploadIdButtonDisabled: {
    opacity: theme.opacity.disabled,
  },
  uploadIdButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
  },
  menuCard: {
    backgroundColor: theme.colors.surface,
    ...theme.borderRadius.cardAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  menuDivider: {
    height: theme.borderWidth.thin,
    backgroundColor: theme.colors.borderSubtle,
    marginLeft: theme.spacing.md + 40 + theme.spacing.md,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
  },
  reviewsCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    ...theme.borderRadius.cardAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  reviewsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  ratingSummaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accentTint,
    paddingVertical: theme.spacing.xs / 2,
    paddingHorizontal: theme.spacing.sm,
    ...theme.borderRadius.badgeAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.statusPending,
  },
  ratingSummaryStar: {
    marginRight: 4,
  },
  ratingSummaryScore: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.accentDark,
    marginRight: theme.spacing.xs,
  },
  ratingSummaryCount: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  reviewLoadingContainer: {
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewLoadingText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  noReviewsBox: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  noReviewsText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  reviewsList: {
    marginTop: theme.spacing.xs,
  },
  reviewItemContainer: {
    borderTopWidth: theme.borderWidth.thin,
    borderTopColor: theme.colors.borderSubtle,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  reviewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  reviewerAvatarBox: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  reviewerAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    marginRight: theme.spacing.sm,
  },
  reviewerAvatarText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primaryDark,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textPrimary,
  },
  reviewRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  starsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.xs,
  },
  reviewDateText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.textMuted,
  },
  reviewCommentText: {
    fontSize: theme.typography.fontSize.xs,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs / 2,
  },
  authButton: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.statusCancelled,
  },
  authButtonDisabled: {
    opacity: theme.opacity.disabled,
  },
  authButtonText: {
    color: theme.colors.statusCancelled,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.md,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.textPrimary,
    opacity: theme.opacity.disabled,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    maxHeight: '85%',
    ...theme.shadows.lg,
  },
  modalScroll: {
    paddingBottom: theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.xl,
    color: theme.colors.textPrimary,
  },
  modalCloseButton: {
    padding: theme.spacing.xs,
  },
  avatarEditContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  avatarEditPreview: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.full,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  avatarEditPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primarySurface,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  avatarEditText: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primaryDark,
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
  },
  changePhotoButtonText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  inputLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  textInput: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  modalErrorBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.error,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  modalErrorText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.error,
    fontWeight: theme.typography.fontWeight.medium,
  },
  saveProfileButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  saveProfileButtonDisabled: {
    opacity: theme.opacity.disabled,
  },
  saveProfileButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.md,
  },
  earningsCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    ...theme.borderRadius.cardAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  earningsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.sm,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xs,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.borderSubtle,
  },
  earningsColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  earningsDivider: {
    width: theme.borderWidth.thin,
    height: '70%',
    backgroundColor: theme.colors.border,
  },
  earningsValuePrimary: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.lg,
    color: theme.colors.primary,
    marginBottom: 2,
  },
  earningsValueWarning: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.lg,
    color: theme.colors.accent,
    marginBottom: 2,
  },
  earningsValue: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.lg,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  earningsLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  modalHeaderTitleBox: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  modalSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  modalSectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.primary,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm,
  },
  reportUserButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.statusCancelled,
    paddingVertical: theme.spacing.xs + 2,
    paddingHorizontal: theme.spacing.md,
    ...theme.borderRadius.buttonAsymmetric,
  },
  reportUserButtonText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.statusCancelled,
  },
  reportReasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.md,
  },
  reportReasonChip: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  reportReasonChipActive: {
    backgroundColor: theme.colors.primarySurface,
    borderColor: theme.colors.primary,
  },
  reportReasonText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
  },
  reportReasonTextActive: {
    color: theme.colors.primaryDark,
    fontWeight: theme.typography.fontWeight.bold,
  },
  reportDetailsInput: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: theme.spacing.md,
  },
  submitReportButton: {
    backgroundColor: theme.colors.error,
    paddingVertical: theme.spacing.md,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  submitReportButtonDisabled: {
    opacity: theme.opacity.disabled,
  },
  submitReportButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.md,
  },
  cancelReportButton: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingVertical: theme.spacing.sm,
    ...theme.borderRadius.buttonAsymmetric,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
  },
  cancelReportButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    lineHeight: theme.typography.lineHeight.sm,
  },
  referralCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    ...theme.borderRadius.cardAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  referralHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  referralHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  referralIconBox: {
    width: 38,
    height: 38,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  referralHeaderTextContainer: {
    flex: 1,
  },
  referralTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.md,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  referralSlogan: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
  },
  referralCodeBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.borderRadius.md,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  codeTextContainer: {
    flex: 1,
  },
  codeLabel: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  codeValue: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: theme.typography.lineHeight.lg,
    color: theme.colors.primaryDark,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primarySurface,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.primary,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
  },
  copyButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryDark,
  },
  copyButtonText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.primaryDark,
  },
  copyButtonTextActive: {
    color: theme.colors.surface,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm + 2,
    paddingHorizontal: theme.spacing.md,
    ...theme.borderRadius.buttonAsymmetric,
    ...theme.shadows.sm,
  },
  shareButtonText: {
    color: theme.colors.surface,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
  },
  notificationSettingsCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    ...theme.borderRadius.cardAsymmetric,
    borderWidth: theme.borderWidth.thin,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  notificationSettingsHeader: {
    marginBottom: theme.spacing.sm,
  },
  notificationSettingsSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  toggleRowBorder: {
    borderTopWidth: theme.borderWidth.thin,
    borderTopColor: theme.colors.borderSubtle,
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.md,
  },
  toggleTextContainer: {
    flex: 1,
    paddingRight: theme.spacing.md,
  },
  toggleTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    lineHeight: theme.typography.lineHeight.sm,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  toggleDescription: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.regular,
    lineHeight: theme.typography.lineHeight.xs,
    color: theme.colors.textSecondary,
  },
});

export default ProfileScreen;
