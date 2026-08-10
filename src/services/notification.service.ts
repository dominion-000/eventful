import { Notification } from '../models/Notification';
import { AppError } from '../utils/AppError';

export async function listMyNotifications(userId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [items, total, unreadCount] = await Promise.all([
    Notification.find({ recipient: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments({ recipient: userId }),
    Notification.countDocuments({ recipient: userId, read: false }),
  ]);
  return { items, unreadCount, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const notification = await Notification.findOne({ _id: notificationId, recipient: userId });
  if (!notification) throw AppError.notFound('Notification not found');
  notification.read = true;
  await notification.save();
  return notification;
}
