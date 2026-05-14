import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';

export function useSatkerDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'satker'],
    queryFn: async () => {
      const res = await dashboardApi.getSatker();
      return res.data.data || res.data;
    },
  });
}

export function useBidtekkomDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'bidtekkom'],
    queryFn: async () => {
      const res = await dashboardApi.getBidtekkom();
      return res.data?.data || res.data;
    },
  });
}

export function usePadalDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'padal'],
    queryFn: async () => {
      const res = await dashboardApi.getPadal();
      return res.data?.data || res.data;
    },
  });
}

export function useTeknisiDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'teknisi'],
    queryFn: async () => {
      const res = await dashboardApi.getTeknisi();
      return res.data?.data || res.data;
    },
  });
}
