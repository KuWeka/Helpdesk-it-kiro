import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffApi } from '@/lib/api';

export function useStaffUsers(params?: Record<string, string | number>) {
  return useQuery({
    queryKey: ['staff', 'users', params],
    queryFn: async () => {
      const res = await staffApi.listUsers(params);
      return { data: res.data.data || [], pagination: res.data.pagination };
    },
  });
}

export function useChangeRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      staffApi.changeRole(userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

export function useSoftDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, forceDelete }: { userId: string; forceDelete?: boolean }) =>
      staffApi.softDelete(userId, forceDelete ? { forceDelete: true } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (userId: string) => staffApi.resetPassword(userId),
  });
}

export function useTeams() {
  return useQuery({
    queryKey: ['staff', 'teams'],
    queryFn: async () => {
      const res = await staffApi.getTeams();
      return res.data.data || [];
    },
  });
}

export function useAvailableTeknisi() {
  return useQuery({
    queryKey: ['staff', 'available-teknisi'],
    queryFn: async () => {
      const res = await staffApi.getAvailableTeknisi();
      return res.data.data || [];
    },
  });
}
