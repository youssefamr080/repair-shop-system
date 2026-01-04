/**
 * DataTableToolbar - Search & Filter Toolbar
 * 
 * Features:
 * - Global search input
 * - Custom filter dropdowns
 * - Clear filters button
 * - RTL support
 */

import { Table } from '@tanstack/react-table';
import { X } from 'lucide-react';
import { Input, Button } from '../../ui';

interface DataTableToolbarProps<TData> {
    table: Table<TData>;
    searchPlaceholder?: string;
    searchColumn?: string;
}

export function DataTableToolbar<TData>({
    table,
    searchPlaceholder = 'ابحث...',
    searchColumn = 'name', // Default column to search
}: DataTableToolbarProps<TData>) {
    const isFiltered = table.getState().columnFilters.length > 0;

    return (
        <div className="flex items-center justify-between">
            <div className="flex flex-1 items-center space-x-2">
                <Input
                    placeholder={searchPlaceholder}
                    value={(table.getColumn(searchColumn)?.getFilterValue() as string) ?? ''}
                    onChange={(event) =>
                        table.getColumn(searchColumn)?.setFilterValue(event.target.value)
                    }
                    className="h-8 w-[150px] lg:w-[250px]"
                />
                {isFiltered && (
                    <Button
                        variant="ghost"
                        onClick={() => table.resetColumnFilters()}
                        className="h-8 px-2 lg:px-3"
                    >
                        مسح
                        <X className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
