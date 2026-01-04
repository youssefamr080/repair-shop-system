/**
 * React Query Provider Setup - Mayo Fix
 * 
 * Provides caching, automatic refetching, and optimistic updates
 */

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { toast } from 'sonner';

// Create a client with sensible defaults for a desktop app
export const queryClient = new QueryClient({
    queryCache: new QueryCache({
        onError: (error) => {
            console.error('Global Query Error:', error);
            toast.error('حدث خطأ أثناء جلب البيانات', {
                description: error instanceof Error ? error.message : 'يرجى التحقق من الاتصال والمحاولة مرة أخرى'
            });
        }
    }),
    mutationCache: new MutationCache({
        onError: (error) => {
            console.error('Global Mutation Error:', error);
            toast.error('فشلت العملية', {
                description: error instanceof Error ? error.message : 'يرجى المحاولة مرة أخرى'
            });
        }
    }),
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes - data considered fresh
            gcTime: 1000 * 60 * 10,   // 10 minutes - cache garbage collection (formerly cacheTime)
            refetchOnWindowFocus: false, // Don't refetch when window regains focus (performance boost)
            refetchOnMount: true,        // Refetch on component mount if stale
            retry: 1,                    // Only retry failed queries once
            retryDelay: 1000,           // Wait 1s between retries
        },
        mutations: {
            retry: 1,
        },
    },
});

interface QueryProviderProps {
    children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}

export default QueryProvider;
