/**
 * Helper utilities for IPC handlers - Mayo Fix
 * 
 * Provides common patterns for handlers like caching, error handling, etc.
 */

import { productsCache, categoriesCache, warehousesCache, suppliersCache, settingsCache } from './cache';

/**
 * Clear all caches (useful after data mutations)
 */
export function clearAllCaches(): void {
  productsCache.clear();
  categoriesCache.clear();
  warehousesCache.clear();
  suppliersCache.clear();
  settingsCache.clear();
}

/**
 * Clear specific cache by type
 */
export function clearCache(type: 'products' | 'categories' | 'warehouses' | 'suppliers' | 'settings'): void {
  switch (type) {
    case 'products':
      productsCache.clear();
      break;
    case 'categories':
      categoriesCache.clear();
      break;
    case 'warehouses':
      warehousesCache.clear();
      break;
    case 'suppliers':
      suppliersCache.clear();
      break;
    case 'settings':
      settingsCache.clear();
      break;
  }
}
