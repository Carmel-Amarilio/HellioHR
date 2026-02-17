import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface Notification {
  id: string;
  userId: string | null;
  type: string;
  title: string;
  message: string;
  metadata: any;
  read: boolean;
  createdAt: string;
  readAt: string | null;
}

/**
 * Fetch notifications for the current user
 */
export async function fetchNotifications(unreadOnly = false): Promise<Notification[]> {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const url = `${API_URL}/api/notifications`;
  console.log('[notificationService] Fetching from:', url, 'unreadOnly:', unreadOnly);

  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` },
    params: { unreadOnly: unreadOnly.toString() },
  });

  console.log('[notificationService] Response:', response.status, response.data.length, 'notifications');
  return response.data;
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(notificationId: string): Promise<Notification> {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await axios.patch(
    `${API_URL}/api/notifications/${notificationId}/read`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data;
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(): Promise<number> {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await axios.post(
    `${API_URL}/api/notifications/mark-all-read`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return response.data.count;
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Not authenticated');
  }

  await axios.delete(`${API_URL}/api/notifications/${notificationId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
