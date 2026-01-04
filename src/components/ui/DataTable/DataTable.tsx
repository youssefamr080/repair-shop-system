/**
 * DataTable - Reusable Table Component with TanStack Table v8
 * 
 * Features:
 * - Sorting (single/multi column)
 * - Filtering (global + column-specific)
 * - Pagination (client-side)
 * - Row selection
 * - Column visibility
 * - Responsive design
 * - RTL support (Arabic)
 */

import React from 'react';
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    SortingState,
    ColumnFiltersState,
    VisibilityState,
    useReactTable,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../Button';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../Table';

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    // Optional features
    enableSorting?: boolean;
    enableFiltering?: boolean;
    enablePagination?: boolean;
    enableRowSelection?: boolean;
    // Callbacks
    onRowClick?: (row: TData) => void;
    // Custom toolbar
    toolbar?: React.ReactNode;
    // Pagination config
    pageSize?: number;
}

export function DataTable<TData, TValue>({
    columns,
    data,
    enableSorting = false,
    enableFiltering = false,
    enablePagination = false,
    enableRowSelection = false,
    onRowClick,
    toolbar,
    pageSize = 10,
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = React.useState({});

    const table = useReactTable({
        data,
        columns,
        // Core
        getCoreRowModel: getCoreRowModel(),
        // Sorting
        onSortingChange: setSorting,
        getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
        // Filtering
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
        // Pagination
        getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
        // Column visibility
        onColumnVisibilityChange: setColumnVisibility,
        // Row selection
        onRowSelectionChange: enableRowSelection ? setRowSelection : undefined,
        enableRowSelection: enableRowSelection,
        // State
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
        },
        // Initial state
        initialState: {
            pagination: {
                pageSize,
            },
        },
    });

    return (
        <div className="space-y-4">
            {/* Toolbar (Search, Filters, etc.) */}
            {toolbar}

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && 'selected'}
                                    onClick={() => onRowClick?.(row.original)}
                                    className={onRowClick ? 'cursor-pointer' : ''}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    لا توجد نتائج
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination (if enabled) */}
            {enablePagination && (
                <div className="flex items-center justify-between px-2">
                    <div className="flex-1 text-sm text-muted-foreground">
                        {enableRowSelection && (
                            <>
                                {table.getFilteredSelectedRowModel().rows.length} من{' '}
                                {table.getFilteredRowModel().rows.length} صف محدد
                            </>
                        )}
                    </div>
                    <div className="flex items-center space-x-6 lg:space-x-8">
                        <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium">عدد الصفوف</p>
                            <select
                                value={table.getState().pagination.pageSize}
                                onChange={(e) => {
                                    table.setPageSize(Number(e.target.value));
                                }}
                                className="h-8 w-[70px] rounded-md border border-input bg-background px-3 py-1 text-sm"
                            >
                                {[10, 20, 30, 40, 50].map((size) => (
                                    <option key={size} value={size}>
                                        {size}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                            صفحة {table.getState().pagination.pageIndex + 1} من{' '}
                            {table.getPageCount()}
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                                className="h-8 w-8"
                            >
                                <span className="sr-only">الصفحة السابقة</span>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                                className="h-8 w-8"
                            >
                                <span className="sr-only">الصفحة التالية</span>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
