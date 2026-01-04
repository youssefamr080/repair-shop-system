/**
 * Notification IPC Handlers - Mayo Fix
 * 
 * 🛡️ SECURITY: All handlers protected with requireAuth middleware
 */

import { ipcMain } from 'electron';
import { notificationsDb } from '../database/notifications';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { logger } from '../utils/logger';

export function setupNotificationHandlers() {
    // List notifications - requires authentication
    ipcMain.handle('db:notifications:list',
        requireAuth(async (_event, _ctx, params) => {
            try {
                return notificationsDb.list(params || {});
            } catch (error) {
                logger.error('Failed to list notifications', 'Notifications', error);
                throw error;
            }
        })
    );

    // Mark as read - requires authentication
    ipcMain.handle('db:notifications:markRead',
        requireAuth(async (_event, _ctx, id: string) => {
            try {
                if (!id) throw new Error('ID is required');
                return notificationsDb.markRead(id);
            } catch (error) {
                logger.error('Failed to mark notification as read', 'Notifications', error);
                throw error;
            }
        })
    );

    // Mark all as read - requires authentication
    ipcMain.handle('db:notifications:markAllRead',
        requireAuth(async (_event, _ctx) => {
            try {
                return notificationsDb.markAllRead();
            } catch (error) {
                logger.error('Failed to mark all notifications as read', 'Notifications', error);
                throw error;
            }
        })
    );

    // Clear all - requires authentication
    ipcMain.handle('db:notifications:clear',
        requireAuth(async (_event, _ctx) => {
            try {
                return notificationsDb.clearAll();
            } catch (error) {
                logger.error('Failed to clear notifications', 'Notifications', error);
                throw error;
            }
        })
    );

    // Get unread count - requires authentication
    ipcMain.handle('db:notifications:getUnreadCount',
        requireAuth(async (_event, _ctx) => {
            try {
                return notificationsDb.getUnreadCount();
            } catch (error) {
                logger.error('Failed to get unread count', 'Notifications', error);
                throw error;
            }
        })
    );

    // Create notification - requires authentication
    ipcMain.handle('db:notifications:create',
        requireAuth(async (_event, _ctx, data) => {
            try {
                // Validate input
                const schema = z.object({
                    type: z.enum(['info', 'success', 'warning', 'error', 'low_stock', 'out_of_stock']),
                    title: z.string(),
                    message: z.string(),
                    link: z.string().optional(),
                    action_label: z.string().optional()
                });

                const validData = schema.parse(data);
                return notificationsDb.create(validData);
            } catch (error) {
                logger.error('Failed to create notification', 'Notifications', error);
                throw error;
            }
        })
    );

    logger.info('Notification handlers registered with auth protection', 'Handlers');
}
