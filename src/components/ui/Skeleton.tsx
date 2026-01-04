import { cn } from '../../utils/helpers';

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
    return (
        <div className={cn('animate-pulse rounded bg-muted', className)} />
    );
}

export function SkeletonText({ className }: SkeletonProps) {
    return (
        <div className={cn('h-4 w-full animate-pulse rounded bg-muted', className)} />
    );
}

interface SkeletonCardProps {
    className?: string;
    lines?: number;
}

export function SkeletonCard({ className, lines = 3 }: SkeletonCardProps) {
    return (
        <div className={cn('rounded-lg border bg-card p-4 space-y-3', className)}>
            <Skeleton className="h-5 w-1/3" />
            {Array.from({ length: lines }).map((_, i) => (
                <SkeletonText key={i} className={i === lines - 1 ? 'w-2/3' : ''} />
            ))}
        </div>
    );
}

interface SkeletonTableProps {
    rows?: number;
    columns?: number;
    className?: string;
}

export function SkeletonTable({ rows = 5, columns = 6, className }: SkeletonTableProps) {
    return (
        <div className={cn('w-full', className)}>
            {/* Header */}
            <div className="flex gap-4 border-b pb-3">
                {Array.from({ length: columns }).map((_, i) => (
                    <Skeleton key={i} className="h-4 flex-1" />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={rowIndex} className="flex gap-4 py-3 border-b last:border-0">
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <Skeleton key={colIndex} className="h-4 flex-1" />
                    ))}
                </div>
            ))}
        </div>
    );
}
