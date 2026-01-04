/**
 * SelectColumn - Checkbox Selection Column Helper
 * 
 * Usage:
 * import { createSelectColumn } from '@/components/ui/DataTable/columns';
 * const columns = [createSelectColumn(), ...otherColumns];
 */

import { ColumnDef } from '@tanstack/react-table';

export function createSelectColumn<TData>(): ColumnDef<TData> {
    return {
        id: 'select',
        header: ({ table }) => (
            <input
                type="checkbox"
                checked={table.getIsAllPageRowsSelected()}
                onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
                aria-label="تحديد الكل"
                className="h-4 w-4 rounded border-gray-300 cursor-pointer"
            />
        ),
        cell: ({ row }) => (
            <input
                type="checkbox"
                checked={row.getIsSelected()}
                onChange={(e) => row.toggleSelected(!!e.target.checked)}
                aria-label="تحديد الصف"
                className="h-4 w-4 rounded border-gray-300 cursor-pointer"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    };
}

// Export as both function and object for flexibility
export const SelectColumn = createSelectColumn;
