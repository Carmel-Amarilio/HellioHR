import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateNotificationInput {
  userId?: string;
  type: 'email_processed' | 'draft_created' | 'error';
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface Notification {
  id: string;
  userId: string | null;
  type: string;
  title: string;
  message: string;
  metadata: any;
  read: boolean;
  createdAt: Date;
  readAt: Date | null;
}

/**
 * Create a new notification
 */
export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata,
    },
  });

  return notification;
}

/**
 * Get all notifications for a user (or all if no userId)
 */
export async function getUserNotifications(
  userId?: string,
  unreadOnly = false
): Promise<Notification[]> {
  const where: any = {};

  if (userId) {
    where.userId = userId;
  }

  if (unreadOnly) {
    where.read = false;
  }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50, // Limit to most recent 50
  });

  return notifications;
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(notificationId: string): Promise<Notification> {
  const notification = await prisma.notification.update({
    where: { id: notificationId },
    data: {
      read: true,
      readAt: new Date(),
    },
  });

  return notification;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      read: false,
    },
    data: {
      read: true,
      readAt: new Date(),
    },
  });

  return result.count;
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  await prisma.notification.delete({
    where: { id: notificationId },
  });
}
