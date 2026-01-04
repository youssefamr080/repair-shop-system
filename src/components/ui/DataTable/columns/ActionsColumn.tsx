/**
 * ActionsColumn - Actions Dropdown Column Helper
 * 
 * Usage:
 * import { createActionsColumn } from '@/components/ui/DataTable/columns';
 * const columns = [...otherColumns, createActionsColumn({ onEdit, onDelete })];
 */

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../../ui';

interface ActionsColumnOptions<TData> {
    onEdit?: (row: TData) => void;
    onDelete?: (row: TData) => void;
    customActions?: Array<{
        icon: React.ComponentType<{ className?: string }>;
        label: string;
        onClick: (row: TData) => void;
        variant?: 'default' | 'destructive';
    }>;
}

export function createActionsColumn<TData>(
    options: ActionsColumnOptions<TData>
): ColumnDef<TData> {
    const { onEdit, onDelete, customActions = [] } = options;

    return {
        id: 'actions',
        header: 'إجراءات',
        cell: ({ row }) => {
            const [isOpen, setIsOpen] = React.useState(false);

            return (
                <div className="relative">
                    <Button
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(!isOpen);
                        }}
                        aria-label="فتح قائمة الإجراءات"
                        aria-haspopup="menu"
                        aria-expanded={isOpen}
                    >
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>

                    {isOpen && (
                        <div className="absolute left-0 z-10 mt-2 w-56 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
                            <div className="py-1" role="menu">
                                {onEdit && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(row.original);
                                            setIsOpen(false);
                                        }}
                                        className="flex w-full items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                    >
                                        <Pencil className="ml-2 h-4 w-4" />
                                        تعديل
                                    </button>
                                )}
                                {customActions.map((action, idx) => {
                                    const Icon = action.icon;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                action.onClick(row.original);
                                                setIsOpen(false);
                                            }}
                                            className={`flex w-full items-center px-4 py-2 text-sm hover:bg-gray-100 ${action.variant === 'destructive'
                                                ? 'text-red-600'
                                                : 'text-gray-700'
                                                }`}
                                        >
                                            <Icon className="ml-2 h-4 w-4" />
                                            {action.label}
                                        </button>
                                    );
                                })}
                                {onDelete && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(row.original);
                                            setIsOpen(false);
                                        }}
                                        className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                    >
                                        <Trash2 className="ml-2 h-4 w-4" />
                                        حذف
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            );
        },
        enableSorting: false,
        enableHiding: false,
    };
}

export const ActionsColumn = createActionsColumn;
