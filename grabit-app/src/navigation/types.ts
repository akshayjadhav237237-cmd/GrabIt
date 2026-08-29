import type { NavigatorScreenParams, CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { Product, BookingPricing, BookingItem } from '../services/api';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type ChatScreenParams = {
  bookingId?: string;
  otherPartyName?: string;
  productTitle?: string;
};

export interface PaymentScreenParams {
  bookingId: string;
  product: Product;
  totalDays: number;
  pricing: BookingPricing;
  startDate: string;
  endDate: string;
}

export interface BookingReceiptScreenParams {
  bookingId: string;
  product: Product;
  totalDays: number;
  pricing: BookingPricing;
  startDate: string;
  endDate: string;
  paymentMethod?: 'wallet' | 'razorpay' | string;
  paidAt?: string;
  transactionId?: string;
  booking?: BookingItem;
}

export type MainTabParamList = {
  Home: undefined;
  Search: { category?: string; search?: string } | undefined;
  Bookings: undefined;
  Chat: ChatScreenParams | undefined;
  AddProduct: { editProductId?: string } | undefined;
  Profile: { userId?: string } | undefined;
};

export type AppStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Search: { category?: string; search?: string } | undefined;
  ProductDetail: { productId?: string } | undefined;
  Payment: {
    bookingId: string;
    product: any;
    totalDays: number;
    pricing: any;
    startDate: string;
    endDate: string;
  };
  BookingReceipt: BookingReceiptScreenParams;
  MyListings: undefined;
  Wishlist?: undefined;
  Bookings?: undefined;
  Chat: { bookingId: string; otherPartyName?: string; productTitle?: string } | undefined;
  Profile: { userId?: string } | undefined;
  AddProduct?: { editProductId?: string } | undefined;
  Auth?: NavigatorScreenParams<AuthStackParamList> | undefined;
};

export type RootStackParamList = {
  Onboarding?: undefined;
  Auth: NavigatorScreenParams<AuthStackParamList> | undefined;
  App: NavigatorScreenParams<AppStackParamList> | undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Search: { category?: string; search?: string } | undefined;
  ProductDetail: { productId?: string } | undefined;
  Payment: {
    bookingId: string;
    product: any;
    totalDays: number;
    pricing: any;
    startDate: string;
    endDate: string;
  };
  BookingReceipt?: BookingReceiptScreenParams;
  MyListings: undefined;
  Wishlist?: undefined;
  Bookings?: undefined;
  Chat: { bookingId: string; otherPartyName?: string; productTitle?: string } | undefined;
  Profile: { userId?: string } | undefined;
  AddProduct?: { editProductId?: string } | undefined;
};

export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<
  AuthStackParamList,
  T
>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<AppStackParamList>
>;

export type AppScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<
  AppStackParamList,
  T
>;

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
