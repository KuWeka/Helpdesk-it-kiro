import { useQuery } from '@tanstack/react-query';
import { reportApi } from '@/lib/api';

export function useMonthlyReport(month: number, year: number) {
  return useQuery({
    queryKey: ['reports', 'monthly', month, year],
    queryFn: async () => {
      const res = await reportApi.getMonthly({ month, year });
      return res.data.data || res.data;
    },
  });
}
