/**
 * Grabit Chat Service
 * Handles sending, retrieving, and subscribing to booking message threads
 * with reliable real-time polling fallback.
 */

import { api, ApiResponse, ChatMessage } from './api';

export type { ChatMessage };

/**
 * Sends a message in a booking discussion thread
 */
export async function sendMessage(
  bookingId: string,
  text: string
): Promise<ApiResponse<ChatMessage>> {
  return api.sendMessage(bookingId, text);
}

/**
 * Retrieves the message history for a booking
 */
export async function getMessages(
  bookingId: string
): Promise<ApiResponse<ChatMessage[]>> {
  return api.getMessages(bookingId);
}

/**
 * Subscribes to real-time message updates for a booking.
 * Polls periodically (every 3s) as a robust fallback for Expo Go and web environments,
 * and performs an immediate fetch upon initial subscription.
 *
 * @param bookingId The ID of the booking thread
 * @param callback Handler receiving the updated list of messages
 * @returns Unsubscribe function to tear down listeners and timers
 */
export function subscribeToMessages(
  bookingId: string,
  callback: (messages: ChatMessage[]) => void
): () => void {
  let isSubscribed = true;

  const fetchLatest = async () => {
    try {
      const res = await api.getMessages(bookingId);
      if (isSubscribed && res.success && Array.isArray(res.data)) {
        callback(res.data);
      }
    } catch {
      // Gracefully continue polling on network hiccups
    }
  };

  // Immediate initial load
  fetchLatest();

  // Periodic poll fallback for 100% reliability in Expo Go and production
  const intervalId = setInterval(fetchLatest, 3000);

  return () => {
    isSubscribed = false;
    clearInterval(intervalId);
  };
}

export const chatService = {
  sendMessage,
  getMessages,
  subscribeToMessages,
};

export default chatService;
