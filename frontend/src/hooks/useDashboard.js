import { useQuery } from '@tanstack/react-query';
import * as businessService from '../services/businessService';
import { queryKeys } from '../lib/queryClient';

/**
 * Single aggregated dashboard request, cached with stale-while-revalidate.
 * Replaces the previous 3 sequential calls (executive + admin + stock sync).
 */
export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboardSummary,
    queryFn: businessService.fetchDashboardSummary,
    staleTime: 60_000,
  });
}

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: queryKeys.notifications(unreadOnly),
    queryFn: () => businessService.fetchNotifications(unreadOnly),
    staleTime: 30_000,
  });
}
