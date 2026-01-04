import { getDatabase } from './core';
import { v4 as uuidv4 } from 'uuid';

export interface DBNotification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'low_stock' | 'out_of_stock';
    title: string;
    message: string;
    read: number; // 0 or 1
    created_at: string;
    link?: string;
    action_label?: string;
}

// Initialize notifications table (called from initDatabase)
export function initNotificationsTable(): void {
    const db = getDatabase();
    db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        link TEXT,
        action_label TEXT
      )
    `);
}

export const notificationsDb = {
    create: (data: Omit<DBNotification, 'id' | 'read' | 'created_at'>) => {
        const db = getDatabase();
        const id = uuidv4();
        const stmt = db.prepare(`
      INSERT INTO notifications (id, type, title, message, link, action_label)
      VALUES (@id, @type, @title, @message, @link, @action_label)
    `);
        stmt.run({ ...data, id });
        return { id, ...data, read: 0, created_at: new Date().toISOString() };
    },

    list: (params: { limit?: number; unreadOnly?: boolean } = {}) => {
        const db = getDatabase();
        let query = `SELECT * FROM notifications`;
        const conditions = [];

        if (params.unreadOnly) {
            conditions.push(`read = 0`);
        }

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        query += ` ORDER BY created_at DESC`;

        if (params.limit) {
            query += ` LIMIT ${params.limit}`;
        }

        const stmt = db.prepare(query);
        return stmt.all() as DBNotification[];
    },

    markRead: (id: string) => {
        const db = getDatabase();
        const stmt = db.prepare(`UPDATE notifications SET read = 1 WHERE id = ?`);
        stmt.run(id);
        return true;
    },

    markAllRead: () => {
        const db = getDatabase();
        const stmt = db.prepare(`UPDATE notifications SET read = 1 WHERE read = 0`);
        stmt.run();
        return true;
    },

    clearAll: () => {
        const db = getDatabase();
        // Optional: Only clear read ones or all? Let's clear all for "Clear History" 
        // but usually we might want to keep unread. 
        // For now, simple Clear All.
        const stmt = db.prepare(`DELETE FROM notifications`);
        stmt.run();
        return true;
    },

    // Helper to count unread
    getUnreadCount: () => {
        const db = getDatabase();
        const stmt = db.prepare(`SELECT COUNT(*) as count FROM notifications WHERE read = 0`);
        const result = stmt.get() as { count: number };
        return result.count;
    }
};
