import { ipcRenderer, contextBridge } from 'electron'

// Import IPC types
import type {
  CreateProductPayload,
  UpdateProductPayload,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  CreateWarehousePayload,
  UpdateWarehousePayload,
  CreateSupplierPayload,
  UpdateSupplierPayload,
  CreateUnitPayload,
  UpdateUnitPayload,
  StockInPayload,
  StockOutPayload,
  TransferStockPayload,
  AdjustStockPayload
} from './types/ipc'

// --------- Channel Security ---------
const ALLOWED_CHANNEL_PREFIXES = [
  'db:', 'auth:', 'license:', 'update:',
  'main-process-message',
];

function validateChannel(channel: string): void {
  if (!ALLOWED_CHANNEL_PREFIXES.some(prefix => channel.startsWith(prefix))) {
    throw new Error(`Unauthorized IPC channel: ${channel}`);
  }
}

// --------- Expose IPC Renderer ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    validateChannel(channel);
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    validateChannel(channel);
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    validateChannel(channel);
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    validateChannel(channel);
    return ipcRenderer.invoke(channel, ...omit)
  },
})

// --------- Expose Database API ---------
contextBridge.exposeInMainWorld('database', {
  // ============ PARTS ============
  parts: {
    list: (params: { page?: number; pageSize?: number; search?: string; categoryId?: number; supplierId?: number; lowStock?: boolean; outOfStock?: boolean }) =>
      ipcRenderer.invoke('db:parts:list', params),
    getAll: () => ipcRenderer.invoke('db:parts:getAll'),
    getById: (id: number) => ipcRenderer.invoke('db:parts:getById', id),
    search: (query: string, limit?: number) => ipcRenderer.invoke('db:parts:search', query, limit),
    getNextSku: (prefix?: string) => ipcRenderer.invoke('db:parts:getNextSku', prefix),
    create: (part: CreateProductPayload) => ipcRenderer.invoke('db:parts:create', part),
    update: (id: number, updates: UpdateProductPayload) => ipcRenderer.invoke('db:parts:update', id, updates),
    delete: (id: number) => ipcRenderer.invoke('db:parts:delete', id),
  },

  // ============ CATEGORIES ============
  categories: {
    getAll: () => ipcRenderer.invoke('db:categories:getAll'),
    getActive: () => ipcRenderer.invoke('db:categories:getActive'),
    getById: (id: number) => ipcRenderer.invoke('db:categories:getById', id),
    create: (category: CreateCategoryPayload) => ipcRenderer.invoke('db:categories:create', category),
    update: (id: number, updates: UpdateCategoryPayload) => ipcRenderer.invoke('db:categories:update', id, updates),
    delete: (id: number) => ipcRenderer.invoke('db:categories:delete', id),
  },

  // ============ WAREHOUSES ============
  warehouses: {
    getAll: () => ipcRenderer.invoke('db:warehouses:getAll'),
    getActive: () => ipcRenderer.invoke('db:warehouses:getActive'),
    getById: (id: number) => ipcRenderer.invoke('db:warehouses:getById', id),
    getDefault: () => ipcRenderer.invoke('db:warehouses:getDefault'),
    create: (warehouse: CreateWarehousePayload) => ipcRenderer.invoke('db:warehouses:create', warehouse),
    update: (id: number, updates: UpdateWarehousePayload) => ipcRenderer.invoke('db:warehouses:update', id, updates),
    delete: (id: number) => ipcRenderer.invoke('db:warehouses:delete', id),
  },

  // ============ SUPPLIERS ============
  suppliers: {
    getAll: () => ipcRenderer.invoke('db:suppliers:getAll'),
    getActive: () => ipcRenderer.invoke('db:suppliers:getActive'),
    getById: (id: number) => ipcRenderer.invoke('db:suppliers:getById', id),
    create: (supplier: CreateSupplierPayload) => ipcRenderer.invoke('db:suppliers:create', supplier),
    update: (id: number, updates: UpdateSupplierPayload) => ipcRenderer.invoke('db:suppliers:update', id, updates),
    delete: (id: number) => ipcRenderer.invoke('db:suppliers:delete', id),
  },

  // ============ UNITS ============
  units: {
    getAll: () => ipcRenderer.invoke('db:units:getAll'),
    getActive: () => ipcRenderer.invoke('db:units:getActive'),
    getById: (id: number) => ipcRenderer.invoke('db:units:getById', id),
    create: (unit: CreateUnitPayload) => ipcRenderer.invoke('db:units:create', unit),
    update: (id: number, updates: UpdateUnitPayload) => ipcRenderer.invoke('db:units:update', id, updates),
    delete: (id: number) => ipcRenderer.invoke('db:units:delete', id),
  },

  // ============ INVENTORY ============
  inventory: {
    getStockLevel: (productId: number, warehouseId: number) =>
      ipcRenderer.invoke('db:inventory:getStockLevel', productId, warehouseId),
    getProductStock: (productId: number) =>
      ipcRenderer.invoke('db:inventory:getProductStock', productId),
    getWarehouseStock: (warehouseId: number) =>
      ipcRenderer.invoke('db:inventory:getWarehouseStock', warehouseId),
    getLowStock: () => ipcRenderer.invoke('db:inventory:getLowStock'),
    getStats: () => ipcRenderer.invoke('db:inventory:getStats'),
    getTransactions: (filters?: { product_id?: number; warehouse_id?: number; start_date?: string; end_date?: string; limit?: number }) =>
      ipcRenderer.invoke('db:inventory:getTransactions', filters),
    stockIn: (params: StockInPayload) => ipcRenderer.invoke('db:inventory:stockIn', params),
    stockOut: (params: StockOutPayload) => ipcRenderer.invoke('db:inventory:stockOut', params),
    adjust: (params: AdjustStockPayload) => ipcRenderer.invoke('db:inventory:adjust', params),
    transfer: (params: TransferStockPayload) => ipcRenderer.invoke('db:inventory:transfer', params),
  },

  // ============ REPAIRS ============
  repairs: {
    list: (filters?: import('../src/types/repairs').RepairFilters) => ipcRenderer.invoke('db:repairs:list', filters),
    get: (id: string) => ipcRenderer.invoke('db:repairs:get', id),
    create: (data: import('../src/types/repairs').CreateRepairInput) => ipcRenderer.invoke('db:repairs:create', data),
    update: (data: import('../src/types/repairs').UpdateRepairInput) => ipcRenderer.invoke('db:repairs:update', data),
    addPart: (data: import('../src/types/repairs').AddRepairPartInput) => ipcRenderer.invoke('db:repairs:addPart', data),
    removePart: (data: import('../src/types/repairs').RemoveRepairPartInput) => ipcRenderer.invoke('db:repairs:removePart', data),
    changeStatus: (data: { repair_id: string; new_status: string; notes?: string }) => ipcRenderer.invoke('db:repairs:changeStatus', data),
  },

  // ============ CUSTOMERS ============
  customers: {
    getAll: () => ipcRenderer.invoke('db:customers:getAll'),
    list: (params?: { page?: number; pageSize?: number; search?: string; isActive?: boolean }) =>
      ipcRenderer.invoke('db:customers:list', params),
    getById: (id: number) => ipcRenderer.invoke('db:customers:getById', id),
    getByPhone: (phone: string) => ipcRenderer.invoke('db:customers:getByPhone', phone),
    search: (query: string, limit?: number) => ipcRenderer.invoke('db:customers:search', query, limit),
    create: (data: Partial<import('../src/types/electron.d').DBCustomer>) => ipcRenderer.invoke('db:customers:create', data),
    update: (id: number, data: Partial<import('../src/types/electron.d').DBCustomer>) => ipcRenderer.invoke('db:customers:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('db:customers:delete', id),
    addTransaction: (data: { customer_id: number; type: 'CREDIT' | 'DEBIT'; amount: number; reference_type: string; reference_id?: string; notes?: string }) => ipcRenderer.invoke('db:customers:addTransaction', data),
  },

  settings: {
    get: (key: string) => ipcRenderer.invoke('db:settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('db:settings:set', key, value),
  },
  health_check: () => ipcRenderer.invoke('db:health_check'),
  getAllSettings: () => ipcRenderer.invoke('db:getAllSettings'),

  // ============ AUDIT ============
  audit: {
    create: (log: Partial<{ action: string; entity_type: string; entity_id: string | null; user_id: string | null; details: string | null; ip_address: string | null }>) =>
      ipcRenderer.invoke('db:audit:create', log),
    getAll: (limit?: number) => ipcRenderer.invoke('db:audit:getAll', limit),
    getFiltered: (filter: { action_type?: string; entity_type?: string; start_date?: string; end_date?: string; search?: string; limit?: number; offset?: number }) =>
      ipcRenderer.invoke('db:audit:getFiltered', filter),
    getEntityTypes: () => ipcRenderer.invoke('db:audit:getEntityTypes'),
    getActionTypes: () => ipcRenderer.invoke('db:audit:getActionTypes'),
    clearOld: (olderThanDays: number) => ipcRenderer.invoke('db:audit:clearOld', olderThanDays),
    delete: (id: number) => ipcRenderer.invoke('db:audit:delete', id),
    deleteAll: () => ipcRenderer.invoke('db:audit:deleteAll'),
  },

  // ============ BACKUP ============
  backup: {
    create: () => ipcRenderer.invoke('db:backup:create'),
    restore: (backupPath: string) => ipcRenderer.invoke('db:backup:restore', backupPath),
    list: () => ipcRenderer.invoke('db:backup:list'),
  },

  // ============ REPORTS ============
  reports: {
    getSales: (params: any) => ipcRenderer.invoke('db:reports:getSales', params),
    getInventoryValue: () => ipcRenderer.invoke('db:reports:getInventoryValue'),
    getTechnicianStats: (params: any) => ipcRenderer.invoke('db:reports:getTechnicianStats', params),
  },
  notifications: {
    list: (params: import('../src/types/notifications').NotificationFilters) => ipcRenderer.invoke('db:notifications:list', params),
    markRead: (id: string) => ipcRenderer.invoke('db:notifications:markRead', id),
    markAllRead: () => ipcRenderer.invoke('db:notifications:markAllRead'),
    clear: () => ipcRenderer.invoke('db:notifications:clear'),
    getUnreadCount: () => ipcRenderer.invoke('db:notifications:getUnreadCount'),
    create: (data: import('../src/types/notifications').CreateNotificationInput) => ipcRenderer.invoke('db:notifications:create', data),
  },
})

// --------- Auth API ---------
contextBridge.exposeInMainWorld('auth', {
  verifyPassword: (password: string) => ipcRenderer.invoke('auth:verifyPassword', password),
  changePassword: (currentPassword: string, newPassword: string) =>
    ipcRenderer.invoke('auth:changePassword', currentPassword, newPassword),
})

// --------- License API ---------
contextBridge.exposeInMainWorld('license', {
  getStatus: () => ipcRenderer.invoke('license:getStatus'),
  getMachineId: () => ipcRenderer.invoke('license:getMachineId'),
  getProductCode: () => ipcRenderer.invoke('license:getProductCode'),
  getDeviceInfo: () => ipcRenderer.invoke('license:getDeviceInfo'),
  activate: (activationKey: string) => ipcRenderer.invoke('license:activate', activationKey),
  renew: () => ipcRenderer.invoke('license:renew'),
  deactivate: () => ipcRenderer.invoke('license:deactivate'),
  checkAndRenew: () => ipcRenderer.invoke('license:checkAndRenew'),
  getConfig: () => ipcRenderer.invoke('license:getConfig'),
  updateConfig: (config: Record<string, unknown>) => ipcRenderer.invoke('license:updateConfig', config),
  applyPreset: (preset: string) => ipcRenderer.invoke('license:applyPreset', preset),
  checkTampering: () => ipcRenderer.invoke('license:checkTampering'),
})
