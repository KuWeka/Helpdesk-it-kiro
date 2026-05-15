import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffApi } from '@/lib/api';

interface UseStaffQueryOptions {
  enabled?: boolean;
  staleTime?: number;
}

export function useStaffUsers(
  params?: Record<string, string | number>,
  options?: UseStaffQueryOptions
) {
  return useQuery({
    queryKey: ['staff', 'users', params],
    queryFn: async () => {
      const res = await staffApi.listUsers(params);
      return { data: res.data.data || [], pagination: res.data.pagination };
    },
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 30_000,
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

export function useTeams(options?: UseStaffQueryOptions) {
  return useQuery({
    queryKey: ['staff', 'teams'],
    queryFn: async () => {
      const res = await staffApi.getTeams();
      return res.data.data || [];
    },
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 30_000,
  });
}

export function useAvailableTeknisi(options?: UseStaffQueryOptions) {
  return useQuery({
    queryKey: ['staff', 'available-teknisi'],
    queryFn: async () => {
      const res = await staffApi.getAvailableTeknisi();
      return res.data.data || [];
    },
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 30_000,
  });
}

export function useAddTeknisiToTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ padalId, teknisiId }: { padalId: string; teknisiId: string }) =>
      staffApi.addTeknisi(padalId, { teknisiId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'teams'] });
      queryClient.invalidateQueries({ queryKey: ['staff', 'available-teknisi'] });
    },
  });
}

export function useRemoveTeknisiFromTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ padalId, teknisiId }: { padalId: string; teknisiId: string }) =>
      staffApi.removeTeknisi(padalId, teknisiId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'teams'] });
      queryClient.invalidateQueries({ queryKey: ['staff', 'available-teknisi'] });
    },
  });
}
