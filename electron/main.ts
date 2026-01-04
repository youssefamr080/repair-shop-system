/**
 * Main Electron Process - Mayo Fix Enterprise
 * 
 * Phone Repair Management System
 * Core: Auth, License, Security, Database
 * Domain: Repairs, Suppliers (Parts)
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Database initialization
import { initDatabase, closeDatabase } from './database';
import { scheduleAutoBackup } from './database/backup';
import { cleanupExpiredSessions } from './database/sessions';

// Utilities
import { logger } from './utils/logger';

// Core handlers
import { setupSettingsHandlers } from './handlers/settings';
import { registerAuthHandlers, initializeDefaultPassword } from './handlers/auth';
import { setupAuditHandlers } from './handlers/audit';
import { setupUserHandlers, initializeDefaultAdminUser } from './handlers/users';

// Parts Suppliers handler (Mayo Fix)
import { setupSupplierHandlers } from './handlers/suppliers';
import { setupPartHandlers } from './handlers/parts';
import { setupInventoryHandlers } from './handlers/inventory';
import { setupReportHandlers } from './handlers/reports';
import { setupNotificationHandlers } from './handlers/notifications';

// License System
import { setupLicenseHandlers } from './handlers/license';
import { checkAndRenewLicense, initializeLicenseSystem } from './license/hybrid-secure';

// Mayo Fix Handlers
import { setupRepairHandlers } from './handlers/repairs';
import { setupCustomerHandlers } from './handlers/customers';

// ESM __dirname polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// PRODUCTION CONSOLE SILENCER
// ============================================================================
const IS_DEV = process.env['VITE_DEV_SERVER_URL'] !== undefined || process.env.NODE_ENV === 'development';

if (!IS_DEV) {
  console.log = () => { };
}

// Directory structure
process.env.APP_ROOT = path.join(__dirname, '..');

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const DIST = path.join(__dirname, '../dist');
export const VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(__dirname, '../public') : DIST;

let win: BrowserWindow | null = null;

// ============================================================================
// SINGLE INSTANCE LOCK - CRITICAL FOR DATABASE INTEGRITY
// ============================================================================
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('[Main] Another instance is already running. Quitting...');
  app.quit();
} else {
  app.on('second-instance', (_event, _commandLine, _workingDirectory) => {
    if (win) {
      if (win.isMinimized()) {
        win.restore();
      }
      win.focus();
    }
  });
}

// ============================================================================
// WINDOW MANAGEMENT
// ============================================================================

function createWindow() {
  // Set App User Model ID for correct taskbar icon grouping
  app.setAppUserModelId('com.mayotech.invpro');

  win = new BrowserWindow({
    icon: path.join(VITE_PUBLIC, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString());
  });

  // 🛡️ Enhancement 4: Content Security Policy (CSP)
  // Prevents XSS and injection attacks
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:;"
        ]
      }
    });
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(DIST, 'index.html'));
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ============================================================================
// CLEANUP ON EXIT
// ============================================================================

let cleanupPromise: Promise<void> | null = null;

async function runCleanup() {
  if (cleanupPromise) {
    return cleanupPromise;
  }

  cleanupPromise = (async () => {
    try {
      logger.info('Starting cleanup...', 'Main');
      closeDatabase();
      logger.info('Cleanup complete', 'Main');
    } catch (error) {
      logger.error('Cleanup error', 'Main', error);
    }
  })();

  return cleanupPromise;
}

let isQuitting = false;

app.on('before-quit', (event) => {
  if (isQuitting) return;

  event.preventDefault();
  isQuitting = true;

  runCleanup()
    .catch((error) => {
      logger.error('Cleanup failed', 'Main', error);
    })
    .finally(() => {
      cleanupPromise = null;
      app.exit(0);
    });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

process.on('unhandledRejection', (reason, promise) => {
  if (!app.isPackaged) {
    logger.error('Unhandled Rejection', 'Main', reason, { promise: String(promise) });
  }
});

// ============================================================================
// IPC HANDLERS SETUP
// ============================================================================

function setupIPCHandlers() {
  // Core handlers
  setupSettingsHandlers();
  setupAuditHandlers();
  registerAuthHandlers();
  setupUserHandlers();

  // Parts Suppliers (Mayo Fix)
  setupSupplierHandlers();

  // Parts Management (Mayo Fix)
  setupPartHandlers();
  setupInventoryHandlers();

  // Customers (Mayo Fix)
  setupCustomerHandlers();

  // Repair System Handlers
  setupRepairHandlers();

  // Reports (V12)
  setupReportHandlers();
  setupNotificationHandlers();
}

// ============================================================================
// APP INITIALIZATION
// ============================================================================

app.whenReady().then(async () => {
  // Initialize license system first
  initializeLicenseSystem();

  // Initialize database
  initDatabase();

  // Initialize default admin password if not exists
  initializeDefaultPassword();

  // Bootstrap default admin user if first run (RBAC)
  initializeDefaultAdminUser();

  // Schedule automatic backups
  scheduleAutoBackup();

  // SECURITY: Clean up expired sessions on startup
  cleanupExpiredSessions();
  
  // 🔒 M1 FIX: Schedule periodic session cleanup every hour
  setInterval(() => {
    cleanupExpiredSessions();
  }, 60 * 60 * 1000);

  // Setup IPC handlers
  setupIPCHandlers();
  setupLicenseHandlers();

  // Check and renew license if needed
  await checkAndRenewLicense();

  createWindow();

  // ============================================================================
  // AUTO UPDATER SETUP
  // ============================================================================
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  
  autoUpdater.on('update-available', (info) => {
    logger.info(`Update available: ${info.version}`, 'AutoUpdater');
    if (win) {
      win.webContents.send('update-available', info);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    logger.info(`Update downloaded: ${info.version}`, 'AutoUpdater');
    if (win) {
      win.webContents.send('update-downloaded', info);
    }
  });

  autoUpdater.on('error', (error) => {
    logger.error(`AutoUpdater error: ${error.message}`, 'AutoUpdater');
  });

  // Check for updates after app is ready
  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    logger.error(`Failed to check for updates: ${err.message}`, 'AutoUpdater');
  });

  // IPC handlers for manual update control
  ipcMain.handle('update:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { success: true, updateInfo: result?.updateInfo };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall(false, true);
  });
});
