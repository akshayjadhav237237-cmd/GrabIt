/**
 * Grabit API Client Service Wrapper
 * Default baseURL connects to the local Grabit Express backend.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface HealthCheckResponse {
  status: string;
  uptime?: number;
  timestamp?: string;
}

export interface ItemListing {
  id: string;
  title: string;
  description: string;
  dailyRate: number;
  category: string;
  ownerId: string;
  images?: string[];
  isAvailable: boolean;
}

export interface ProductOwner {
  _id?: string;
  id?: string;
  displayName?: string;
  name?: string;
  rating?: number;
  email?: string;
}

export interface ProductPrice {
  perDay: number;
  perWeek?: number;
  securityDeposit?: number;
}

export interface ProductLocation {
  address?: string;
  city?: string;
  coordinates?: number[];
}

export interface ProductDamageProtection {
  isAvailable: boolean;
  fee?: number;
}

export interface ProductAvailability {
  isAvailable: boolean;
  blackoutDates?: Array<{
    startDate?: string | Date;
    endDate?: string | Date;
    reason?: string;
  }>;
}

export interface Product {
  _id: string;
  id?: string;
  title: string;
  description: string;
  category: string;
  rentalPrice?: ProductPrice;
  dailyRate?: number;
  securityDeposit?: number;
  location?: ProductLocation;
  city?: string;
  images?: string[];
  owner?: ProductOwner | string;
  damageProtection?: ProductDamageProtection;
  availability?: ProductAvailability;
  createdAt?: string;
  updatedAt?: string;
}

export interface GetProductsParams {
  page?: number;
  limit?: number;
  category?: string;
  city?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc';
}

export interface ReviewAuthor {
  _id?: string;
  id?: string;
  displayName?: string;
  name?: string;
  avatarUrl?: string;
  rating?: number;
}

export interface ReviewItem {
  _id: string;
  id?: string;
  booking?: string | any;
  reviewer: ReviewAuthor | string;
  targetUser?: string;
  product?: Product | string | any;
  rating: number;
  comment?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserReviewsData {
  reviews: ReviewItem[];
  averageRating: number;
  totalReviews: number;
  stats?: {
    averageRating: number;
    totalReviews: number;
  };
}

export interface BlackoutPeriod {
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface BookingPricing {
  rentalFee: number;
  platformFee: number;
  securityDeposit: number;
  damageProtectionFee: number;
  totalAmount: number;
}

export interface BookingParty {
  _id: string;
  id?: string;
  displayName?: string;
  name?: string;
  avatarUrl?: string;
  rating?: number;
  email?: string;
}

export interface ExtensionRequest {
  newEndDate?: string;
  additionalDays?: number;
  additionalRentalFee?: number;
  additionalPlatformFee?: number;
  additionalAmount?: number;
  status?: 'pending' | 'approved' | 'rejected';
  requestedAt?: string;
}

export interface BookingDisputeFlag {
  raised: boolean;
  raisedBy?: string;
  reason?: string;
  raisedAt?: string | Date;
}

export interface BookingItem {
  _id: string;
  id?: string;
  product: Product | any;
  renter: BookingParty | string;
  owner: BookingParty | string;
  startDate: string;
  endDate: string;
  totalDays: number;
  pricing: BookingPricing;
  damageProtectionOpted: boolean;
  status: 'pending' | 'confirmed' | 'cancelled' | 'active' | 'completed';
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  cancellationReason?: string;
  disputeFlag?: BookingDisputeFlag;
  extensionRequest?: ExtensionRequest;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatMessage {
  _id?: string;
  id?: string;
  bookingId: string;
  senderId: string;
  senderName?: string;
  text: string;
  createdAt: string | Date;
}

export interface PaymentOrderData {
  orderId?: string;
  id?: string;
  amount: number;
  currency: string;
  keyId?: string;
  bookingId?: string;
  productTitle?: string;
  [key: string]: any;
}

export interface VerifyPaymentData {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface MyBookingsData {
  asRenter: BookingItem[];
  asOwner: BookingItem[];
}

export interface MyBookingsResponse {
  success: boolean;
  data: MyBookingsData;
  error?: string;
  message?: string;
}

export interface CreateBookingData {
  productId: string;
  startDate: string;
  endDate: string;
  damageProtectionOpted?: boolean;
}

export interface UserEarningsData {
  totalEarned: number;
  pendingPayout: number;
  completedRentalsCount: number;
}

export interface NotificationPreferences {
  bookingUpdates?: boolean;
  chatMessages?: boolean;
}

export interface CreateReportData {
  targetType: 'product' | 'user';
  targetId: string;
  reason: string;
  details?: string;
}

export interface ReportItem {
  _id: string;
  id?: string;
  reporterId: string;
  targetType: 'product' | 'user';
  targetId: string;
  reason: string;
  details?: string;
  status: 'open' | 'reviewed';
  createdAt?: string;
  updatedAt?: string;
}


/**
 * Helper to append image files to FormData across React Native Mobile & Web.
 * - On Web: fetches blob from blob:/data:/http URL and appends as File/Blob.
 * - On Mobile: appends React Native file descriptor object { uri, type, name }.
 */
async function appendImageToFormData(
  formData: FormData,
  fieldName: string,
  uri: string,
  defaultFilename: string = 'image.jpg'
): Promise<void> {
  const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';
  if (isWeb && (uri.startsWith('blob:') || uri.startsWith('data:') || uri.startsWith('http'))) {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append(fieldName, blob, defaultFilename);
      return;
    } catch (err) {
      console.warn('[api] Failed to fetch image blob on web, fallback to RN descriptor:', err);
    }
  }

  // React Native Mobile (Android/iOS)
  formData.append(fieldName, {
    uri,
    type: 'image/jpeg',
    name: defaultFilename,
  } as any);
}

/**
 * Automatically determine the backend base URL:
 * 1. Checks EXPO_PUBLIC_API_URL environment variable.
 * 2. Checks Expo hostUri / debuggerHost to resolve the local network IP of the dev machine
 *    (essential for physical devices and Expo Go on Android/iOS so they connect to port 5000 on the host).
 * 3. Fallback for Android emulator (10.0.2.2:5000/api).
 * 4. Fallback for iOS simulator / web (localhost:5000/api).
 */
export function getDefaultBaseURL(): string {
  if (typeof process !== 'undefined' && (process.env as any)?.EXPO_PUBLIC_API_URL) {
    return (process.env as any).EXPO_PUBLIC_API_URL;
  }

  // 1. Browser/Web Deployment (e.g. Vercel)
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const origin = window.location.origin;
    if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      return `${origin}/api`;
    }
  }

  // 2. Local network IP detection for Expo Go / physical devices
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as any).expoGoConfig?.debuggerHost ||
      (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
      (Constants as any).manifest?.debuggerHost;

    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return `http://${ip}:5000/api`;
      }
    }
  } catch {
    // Ignore and fallback
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }

  return 'http://localhost:5000/api';
}

export class ApiService {
  private baseURL: string;
  private authToken: string | null = null;

  constructor(baseURL?: string) {
    this.baseURL = baseURL || getDefaultBaseURL();
  }

  public setToken(token: string | null): void {
    this.authToken = token;
  }

  public async getAuthToken(): Promise<string | null> {
    if (this.authToken) {
      return this.authToken;
    }
    try {
      const savedAuth = await AsyncStorage.getItem('grabit_auth');
      if (savedAuth) {
        const parsed = JSON.parse(savedAuth);
        if (parsed?.token) {
          this.authToken = parsed.token;
          return parsed.token;
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  public getBaseURL(): string {
    return this.baseURL;
  }

  public setBaseURL(url: string): void {
    this.baseURL = url;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    let path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const cleanBase = this.baseURL.replace(/\/+$/, '');
    if (cleanBase.endsWith('/api') && path.startsWith('/api/')) {
      path = path.substring(4);
    } else if (cleanBase.endsWith('/api') && path === '/api') {
      path = '';
    }
    const url = `${cleanBase}${path}`;

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (!headers.Authorization) {
      const token = await this.getAuthToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const text = await response.text();
      let json: any;
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        return {
          success: false,
          error: `Server returned non-JSON response (${response.status}): ${text.substring(0, 150)}`,
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: json?.message || json?.error || `Request failed with status ${response.status}`,
        };
      }

      return {
        success: true,
        data: json,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network request failed',
      };
    }
  }

  // Placeholder API methods
  public async checkHealth(): Promise<ApiResponse<HealthCheckResponse>> {
    return this.request<HealthCheckResponse>('/health', {
      method: 'GET',
    });
  }

  public async getItems(): Promise<ApiResponse<ItemListing[]>> {
    return this.request<ItemListing[]>('/items', {
      method: 'GET',
    });
  }

  public async getItemById(id: string): Promise<ApiResponse<ItemListing>> {
    return this.request<ItemListing>(`/items/${id}`, {
      method: 'GET',
    });
  }

  public async getProducts(
    params?: GetProductsParams
  ): Promise<ApiResponse<Product[] | { products: Product[]; total?: number; page?: number; pages?: number }>> {
    const queryParts: string[] = [];
    if (params?.page !== undefined) queryParts.push(`page=${params.page}`);
    if (params?.limit !== undefined) queryParts.push(`limit=${params.limit}`);
    if (params?.category) queryParts.push(`category=${encodeURIComponent(params.category)}`);
    if (params?.city) queryParts.push(`city=${encodeURIComponent(params.city)}`);
    if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
    if (params?.minPrice !== undefined) queryParts.push(`minPrice=${params.minPrice}`);
    if (params?.maxPrice !== undefined) queryParts.push(`maxPrice=${params.maxPrice}`);
    if (params?.sort) queryParts.push(`sort=${encodeURIComponent(params.sort)}`);
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    const res = await this.request<any>(`/products${queryString}`, {
      method: 'GET',
    });
    if (!res.success) {
      return { success: false, error: res.error, data: [] };
    }
    const list = res.data?.data || res.data?.products || res.data || [];
    return {
      success: true,
      data: list,
      message: res.data?.message,
    };
  }

  public async getProductById(id: string): Promise<ApiResponse<Product>> {
    const res = await this.request<any>(`/products/${id}`, {
      method: 'GET',
    });
    if (!res.success) {
      return { success: false, error: res.error };
    }
    const product = res.data?.data || res.data?.product || res.data;
    return {
      success: true,
      data: product,
      message: res.data?.message,
    };
  }

  public async getMyProducts(): Promise<ApiResponse<Product[]>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await this.request<any>('/products?mine=true', {
      method: 'GET',
      headers,
    });
    if (!res.success) {
      return { success: false, error: res.error, data: [] };
    }
    const list = res.data?.data || res.data?.products || (Array.isArray(res.data) ? res.data : []);
    return {
      success: true,
      data: Array.isArray(list) ? list : [],
      message: res.data?.message,
    };
  }

  public async checkProductBookings(id: string): Promise<ApiResponse<{ bookingsCount: number; canHardDelete: boolean }>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await this.request<any>(`/products/${id}/bookings-check`, {
      method: 'GET',
      headers,
    });
    if (!res.success) {
      return { success: false, error: res.error };
    }
    return {
      success: true,
      data: res.data?.data || res.data,
      message: res.data?.message,
    };
  }

  public async hardDeleteProduct(id: string): Promise<ApiResponse<{ hardDeleted?: boolean; message?: string }>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return this.request(`/products/${id}?hard=true`, {
      method: 'DELETE',
      headers,
    });
  }

  public async deleteProduct(id: string): Promise<ApiResponse<{ message?: string; data?: Product }>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return this.request(`/products/${id}`, {
      method: 'DELETE',
      headers,
    });
  }

  public async toggleProductAvailability(id: string, isAvailable: boolean): Promise<ApiResponse<Product>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await this.request<any>(`/products/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ availability: { isAvailable } }),
    });
    if (!res.success) {
      return { success: false, error: res.error };
    }
    const product = res.data?.data || res.data?.product || res.data;
    return {
      success: true,
      data: product,
      message: res.data?.message,
    };
  }

  public async updateProduct(id: string, productData: any): Promise<ApiResponse<Product>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await this.request<any>(`/products/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(productData),
    });
    if (!res.success) {
      return { success: false, error: res.error };
    }
    const product = res.data?.data || res.data?.product || res.data;
    return {
      success: true,
      data: product,
      message: res.data?.message,
    };
  }

  public async createProduct(productData: any): Promise<ApiResponse<Product>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await this.request<any>('/products', {
      method: 'POST',
      headers,
      body: JSON.stringify(productData),
    });
    if (!res.success) {
      return { success: false, error: res.error };
    }
    const product = res.data?.data || res.data?.product || res.data;
    return {
      success: true,
      data: product,
      message: res.data?.message,
    };
  }

  public async login(credentials: { email: string; password: string }): Promise<ApiResponse<{ token: string; user: any }>> {
    return this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  public async syncUser(
    token: string,
    userData?: { displayName?: string; referralCode?: string }
  ): Promise<ApiResponse<{ user: any }>> {
    this.setToken(token);
    return this.request<{ user: any }>('/auth/sync', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userData || {}),
    });
  }

  public async getCurrentUser(token: string): Promise<ApiResponse<{ user: any }>> {
    this.setToken(token);
    return this.request<{ user: any }>('/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  public async uploadProductImage(
    productId: string,
    imageUri: string
  ): Promise<ApiResponse<{ imageUrl?: string; images?: string[]; product?: Product }>> {
    const formData = new FormData();
    await appendImageToFormData(formData, 'image', imageUri, 'photo.jpg');

    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await this.request<any>(`/api/products/${productId}/images`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.success) {
      return { success: false, error: res.error };
    }
    return {
      success: true,
      data: res.data?.data || res.data,
      message: res.data?.message,
    };
  }

  public async deleteProductImage(
    productId: string,
    imageUrl: string
  ): Promise<ApiResponse<{ success?: boolean; message?: string; images?: string[] }>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return this.request(`/api/products/${productId}/images`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ imageUrl }),
    });
  }

  public async createBooking(bookingData: {
    productId: string;
    startDate: string;
    endDate: string;
    damageProtectionOpted?: boolean;
  }): Promise<ApiResponse<BookingItem>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await this.request<any>('/api/bookings', {
      method: 'POST',
      headers,
      body: JSON.stringify(bookingData),
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    const booking = res.data?.data || res.data?.booking || res.data;
    return {
      success: true,
      data: booking,
      message: res.data?.message,
    };
  }

  public async getMyBookings(): Promise<ApiResponse<MyBookingsData>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await this.request<any>('/api/bookings/mine', {
      method: 'GET',
      headers,
    });

    if (!res.success) {
      return {
        success: false,
        error: res.error,
        data: { asRenter: [], asOwner: [] },
      };
    }

    const raw = res.data?.data || res.data || {};
    const asRenter = Array.isArray(raw.asRenter) ? raw.asRenter : [];
    const asOwner = Array.isArray(raw.asOwner) ? raw.asOwner : [];

    return {
      success: true,
      data: {
        asRenter,
        asOwner,
      },
    };
  }

  public async updateBookingStatus(
    bookingId: string,
    status: 'confirmed' | 'cancelled' | 'completed' | string,
    reason?: string
  ): Promise<ApiResponse<BookingItem>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const payload: { status: string; reason?: string; cancellationReason?: string } = { status };
    if (reason !== undefined && reason !== null) {
      payload.reason = reason;
      payload.cancellationReason = reason;
    }

    const res = await this.request<any>(`/api/bookings/${bookingId}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    const booking = res.data?.data || res.data?.booking || res.data;
    return {
      success: true,
      data: booking,
      message: res.data?.message,
    };
  }

  public async getBookingById(bookingId: string): Promise<ApiResponse<BookingItem>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await this.request<any>(`/api/bookings/${bookingId}`, {
      method: 'GET',
      headers,
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    const booking = res.data?.data || res.data?.booking || res.data;
    return {
      success: true,
      data: booking,
      message: res.data?.message,
    };
  }

  public async createPaymentOrder(bookingId: string): Promise<ApiResponse<PaymentOrderData>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await this.request<any>(`/api/bookings/${bookingId}/create-order`, {
      method: 'POST',
      headers,
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    const orderData = res.data?.data || res.data?.order || res.data;
    return {
      success: true,
      data: orderData,
      message: res.data?.message,
    };
  }

  public async verifyPayment(
    bookingId: string,
    paymentData: VerifyPaymentData
  ): Promise<ApiResponse<{ success?: boolean; booking?: BookingItem; message?: string; [key: string]: any }>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await this.request<any>(`/api/bookings/${bookingId}/verify-payment`, {
      method: 'POST',
      headers,
      body: JSON.stringify(paymentData),
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    const result = res.data?.data || res.data;
    return {
      success: true,
      data: result,
      message: res.data?.message,
    };
  }

  public async payWithWallet(bookingId: string): Promise<ApiResponse<BookingItem>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await this.request<any>(`/api/bookings/${bookingId}/pay-wallet`, {
      method: 'POST',
      headers,
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    const booking = res.data?.data || res.data?.booking || res.data;
    return {
      success: true,
      data: booking,
      message: res.data?.message || 'Payment completed successfully via Grabit Wallet',
    };
  }

  public async sendMessage(bookingId: string, text: string): Promise<ApiResponse<ChatMessage>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await this.request<any>(`/api/bookings/${bookingId}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text }),
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    const message = res.data?.data || res.data?.message || res.data;
    return {
      success: true,
      data: message,
    };
  }

  public async getMessages(bookingId: string): Promise<ApiResponse<ChatMessage[]>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await this.request<any>(`/api/bookings/${bookingId}/messages`, {
      method: 'GET',
      headers,
    });

    if (!res.success) {
      return { success: false, error: res.error, data: [] };
    }

    const raw = res.data?.data || res.data?.messages || res.data;
    const messages = Array.isArray(raw) ? raw : [];
    return {
      success: true,
      data: messages,
    };
  }

  public async updatePushToken(
    pushToken: string
  ): Promise<ApiResponse<{ success?: boolean; message?: string }>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await this.request<any>('/api/users/push-token', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ pushToken, token: pushToken }),
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    return {
      success: true,
      data: res.data?.data || res.data,
      message: res.data?.message,
    };
  }

  public async addReview(reviewData: {
    bookingId: string;
    rating: number;
    comment?: string;
  }): Promise<ApiResponse<ReviewItem>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await this.request<any>('/api/reviews', {
      method: 'POST',
      headers,
      body: JSON.stringify(reviewData),
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    return {
      success: true,
      data: res.data?.data || res.data?.review || res.data,
      message: res.data?.message,
    };
  }

  public async getUserReviews(
    userId: string,
    page?: number,
    limit?: number
  ): Promise<ApiResponse<UserReviewsData>> {
    const queryParts: string[] = [];
    if (page !== undefined) queryParts.push(`page=${page}`);
    if (limit !== undefined) queryParts.push(`limit=${limit}`);
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await this.request<any>(`/api/reviews/user/${userId}${queryString}`, {
      method: 'GET',
      headers,
    });

    if (!res.success) {
      return {
        success: false,
        error: res.error,
        data: { reviews: [], averageRating: 0, totalReviews: 0 },
      };
    }

    const raw = res.data?.data || res.data || {};
    let reviews: ReviewItem[] = [];
    if (Array.isArray(raw)) {
      reviews = raw;
    } else if (Array.isArray(raw.reviews)) {
      reviews = raw.reviews;
    }

    const averageRating =
      typeof raw.averageRating === 'number'
        ? raw.averageRating
        : typeof raw.stats?.averageRating === 'number'
        ? raw.stats.averageRating
        : 0;

    const totalReviews =
      typeof raw.totalReviews === 'number'
        ? raw.totalReviews
        : typeof raw.stats?.totalReviews === 'number'
        ? raw.stats.totalReviews
        : reviews.length;

    return {
      success: true,
      data: {
        reviews,
        averageRating,
        totalReviews,
      },
    };
  }

  public async verifyUser(
    idDocumentUri: string
  ): Promise<ApiResponse<{ status?: string; message?: string; user?: any; verification?: { status: string; idDocumentUrl?: string }; [key: string]: any }>> {
    const formData = new FormData();
    await appendImageToFormData(formData, 'idDocument', idDocumentUri, 'id_document.jpg');

    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await this.request<any>('/api/users/verify', {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    return {
      success: true,
      data: res.data?.data || res.data,
      message: res.data?.message,
    };
  }

  public async updateProfile(data: {
    displayName?: string;
    phoneNumber?: string;
    avatarUri?: string;
  }): Promise<ApiResponse<{ user?: any; [key: string]: any }>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let body: any;
    if (
      data.avatarUri &&
      (data.avatarUri.startsWith('blob:') ||
        data.avatarUri.startsWith('data:') ||
        data.avatarUri.startsWith('file:'))
    ) {
      const formData = new FormData();
      if (data.displayName) formData.append('displayName', data.displayName);
      if (data.phoneNumber) formData.append('phoneNumber', data.phoneNumber);
      await appendImageToFormData(formData, 'avatar', data.avatarUri, 'avatar.jpg');
      body = formData;
    } else {
      body = JSON.stringify(data);
    }

    const res = await this.request<any>('/api/users/me', {
      method: 'PATCH',
      headers,
      body,
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    return {
      success: true,
      data: res.data?.data || res.data,
      message: res.data?.message,
    };
  }

  public async updateProductAvailability(
    productId: string,
    blackoutDates: Array<{ startDate: string; endDate: string; reason?: string }>
  ): Promise<ApiResponse<Product>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await this.request<any>(`/api/products/${productId}/availability`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ blackoutDates }),
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    return {
      success: true,
      data: res.data?.data || res.data?.product || res.data,
      message: res.data?.message,
    };
  }

  public async requestBookingExtension(
    id: string,
    newEndDate: string
  ): Promise<ApiResponse<BookingItem>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await this.request<any>(`/api/bookings/${id}/extend`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ newEndDate }),
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    const booking = res.data?.data || res.data?.booking || res.data;
    return {
      success: true,
      data: booking,
      message: res.data?.message,
    };
  }

  public async respondBookingExtension(
    id: string,
    approve: boolean
  ): Promise<ApiResponse<BookingItem>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await this.request<any>(`/api/bookings/${id}/extend-response`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ approve }),
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    const booking = res.data?.data || res.data?.booking || res.data;
    return {
      success: true,
      data: booking,
      message: res.data?.message,
    };
  }

  public async createReport(data: {
    targetType: 'product' | 'user';
    targetId: string;
    reason: string;
    details?: string;
  }): Promise<ApiResponse<any>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await this.request<any>('/api/reports', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    return {
      success: true,
      data: res.data?.data || res.data?.report || res.data,
      message: res.data?.message,
    };
  }

  public async raiseDispute(
    bookingId: string,
    reason: string
  ): Promise<ApiResponse<BookingItem>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await this.request<any>(`/api/bookings/${bookingId}/dispute`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ reason }),
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    const booking = res.data?.data || res.data?.booking || res.data;
    return {
      success: true,
      data: booking,
      message: res.data?.message,
    };
  }

  public async getEarnings(): Promise<ApiResponse<UserEarningsData>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await this.request<any>('/api/users/me/earnings', {
      method: 'GET',
      headers,
    });

    if (!res.success) {
      return {
        success: false,
        error: res.error,
        data: { totalEarned: 0, pendingPayout: 0, completedRentalsCount: 0 },
      };
    }

    const raw = res.data?.data || res.data || {};
    return {
      success: true,
      data: {
        totalEarned: typeof raw.totalEarned === 'number' ? raw.totalEarned : 0,
        pendingPayout: typeof raw.pendingPayout === 'number' ? raw.pendingPayout : 0,
        completedRentalsCount:
          typeof raw.completedRentalsCount === 'number' ? raw.completedRentalsCount : 0,
      },
      message: res.data?.message,
    };
  }

  public async getWishlist(): Promise<ApiResponse<Product[]>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await this.request<any>('/api/users/me/wishlist', {
      method: 'GET',
      headers,
    });

    if (!res.success) {
      return {
        success: false,
        error: res.error,
        data: [],
      };
    }

    const raw = res.data?.data || res.data?.wishlist || res.data || [];
    const list = Array.isArray(raw) ? raw : [];

    return {
      success: true,
      data: list,
      message: res.data?.message,
    };
  }

  public async addToWishlist(
    productId: string
  ): Promise<ApiResponse<{ wishlist?: string[]; message?: string }>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await this.request<any>(`/api/users/me/wishlist/${productId}`, {
      method: 'POST',
      headers,
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    return {
      success: true,
      data: res.data?.data || res.data,
      message: res.data?.message,
    };
  }

  public async removeFromWishlist(
    productId: string
  ): Promise<ApiResponse<{ wishlist?: string[]; message?: string }>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await this.request<any>(`/api/users/me/wishlist/${productId}`, {
      method: 'DELETE',
      headers,
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    return {
      success: true,
      data: res.data?.data || res.data,
      message: res.data?.message,
    };
  }

  public async updateNotificationPrefs(prefs: {
    bookingUpdates?: boolean;
    chatMessages?: boolean;
  }): Promise<ApiResponse<NotificationPreferences>> {
    const token = await this.getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await this.request<any>('/api/users/me/notification-prefs', {
      method: 'PATCH',
      headers,
      body: JSON.stringify(prefs),
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    return {
      success: true,
      data: res.data?.data || res.data,
      message: res.data?.message,
    };
  }
}

export const api = new ApiService();
export default api;

export { resolveImageUrl } from '../utils/imageUrl';



