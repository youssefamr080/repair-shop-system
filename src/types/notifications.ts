/**
 * Notification System Type Definitions
 * 
 * Mayo Fix Enterprise - Types for smart alerts and notifications
 */

// ============================================================
// NOTIFICATION TYPES
// ============================================================

export type NotificationType =
    | 'info'         // معلومة عامة
    | 'warning'      // تحذير
    | 'error'        // خطأ
    | 'success'      // نجاح
    | 'stock'        // تنبيه مخزون
    | 'low_stock'    // مخزون منخفض
    | 'out_of_stock' // نفاد المخزون
    | 'repair'       // تنبيه صيانة
    | 'system';      // تنبيه نظام

// ============================================================
// DATABASE ENTITY
// ============================================================

export interface DBNotification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    link: string | null;
    action_label: string | null;
    read: number; // 0 = unread, 1 = read
    created_at: string;
    read_at: string | null;
}

// ============================================================
// INPUT TYPES
// ============================================================

export interface CreateNotificationInput {
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    action_label?: string;
}

export interface NotificationFilters {
    limit?: number;
    unreadOnly?: boolean;
    type?: NotificationType;
}

// ============================================================
// COMPONENT TYPES
// ============================================================

export interface NotificationItemProps {
    notification: DBNotification;
    onRead: (id: string) => void;
    onAction?: (notification: DBNotification) => void;
}

export interface NotificationBadgeProps {
    count: number;
    type?: NotificationType;
}
