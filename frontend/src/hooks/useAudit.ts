import { useQuery } from '@tanstack/react-query';
import { auditApi } from '@/lib/api';

export function useAuditLogs(params?: Record<string, string | number>) {
  return useQuery({
    queryKey: ['audit', params],
    queryFn: async () => {
      const res = await auditApi.list(params);
      return { data: res.data.data || [], pagination: res.data.pagination };
    },
  });
}
