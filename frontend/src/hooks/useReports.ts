import { useQuery } from '@tanstack/react-query';
import { reportApi } from '@/lib/api';

interface UseMonthlyReportOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

export function useMonthlyReport(month: number, year: number, options?: UseMonthlyReportOptions) {
  return useQuery({
    queryKey: ['reports', 'monthly', month, year],
    queryFn: async () => {
      const res = await reportApi.getMonthly({ month, year });
      return res.data.data || res.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    gcTime: options?.gcTime ?? 10 * 60 * 1000,
  });
}
