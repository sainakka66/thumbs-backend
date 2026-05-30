import { QueryClient } from '@tanstack/react-query';

/**
 * Stale-while-revalidate defaults: cached data renders instantly on navigation,
 * then revalidates in the background. Tuned for a mobile distribution app.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 min: serve cache instantly, revalidate after
      gcTime: 5 * 60_000, // keep unused cache 5 min
      refetchOnWindowFocus: false,
      retry: 1,
      networkMode: 'offlineFirst', // use cache when offline (PWA)
    },
  },
});

export const queryKeys = {
  dashboardSummary: ['dashboard', 'summary'],
  notifications: (unreadOnly = false) => ['notifications', { unreadOnly }],
  inventory: (page = 1) => ['inventory', { page }],
  stockAlerts: ['stock-alerts'],
};
