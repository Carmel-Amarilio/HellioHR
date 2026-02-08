import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/index.js';
import {
  createNotification,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../services/notificationService.js';

const router = Router();

/**
 * POST /api/notifications
 * Create a new notification (agent calls this)
 */
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, title, message, metadata, userId } = req.body;

    if (!type || !title || !message) {
      return res.status(400).json({ error: 'Missing required fields: type, title, message' });
    }

    const notification = await createNotification({
      userId,
      type,
      title,
      message,
      metadata,
    });

    res.status(201).json(notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

/**
 * GET /api/notifications
 * Get notifications for the current user (or all if admin)
 */
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const unreadOnly = req.query.unreadOnly === 'true';
    const user = req.user;

    // If user is editor, show all notifications; if viewer, show only their own
    const userId = user?.role === 'editor' ? undefined : user?.userId;

    const notifications = await getUserNotifications(userId, unreadOnly);

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a notification as read
 */
router.patch('/:id/read', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
    const notification = await markNotificationRead(id);
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read for the current user
 */
router.post('/mark-all-read', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user?.userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const count = await markAllNotificationsRead(user.userId);
    res.json({ count });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
    await deleteNotification(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

export default router;
