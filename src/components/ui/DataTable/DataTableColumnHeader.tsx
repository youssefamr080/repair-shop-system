/**
 * DataTableColumnHeader - Sortable Column Header Component
 * 
 * Features:
 * - Sort indicators (ascending/descending/none)
 * - Click to toggle sort
 * - Accessible
 * - RTL support
 */

import { Column } from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '../../../utils/helpers';

interface DataTableColumnHeaderProps<TData, TValue>
    extends React.HTMLAttributes<HTMLDivElement> {
    column: Column<TData, TValue>;
    title: string;
}

export function DataTableColumnHeader<TData, TValue>({
    column,
    title,
    className,
}: DataTableColumnHeaderProps<TData, TValue>) {
    if (!column.getCanSort()) {
        return <div className={cn(className)}>{title}</div>;
    }

    return (
        <div className={cn('flex items-center space-x-2', className)}>
            <button
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                className="flex items-center space-x-2 hover:text-foreground transition-colors"
            >
                <span>{title}</span>
                {column.getIsSorted() === 'desc' ? (
                    <ArrowDown className="ml-2 h-4 w-4" />
                ) : column.getIsSorted() === 'asc' ? (
                    <ArrowUp className="ml-2 h-4 w-4" />
                ) : (
                    <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                )}
            </button>
        </div>
    );
}
