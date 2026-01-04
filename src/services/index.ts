/**
 * Services Index - Mayo Fix Enterprise
 * 
 * All database operations go through:
 * - window.database API (frontend IPC calls to Electron main process)
 * 
 * Available APIs:
 * - window.database.repairs    (core)
 * - window.database.suppliers  (parts suppliers)
 * - window.database.settings
 * - window.database.audit
 * - window.database.users
 * 
 * No direct service exports needed.
 */

export { };
