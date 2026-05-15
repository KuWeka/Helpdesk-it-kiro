import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketApi } from '@/lib/api';

export function useTickets(params?: Record<string, string | number>) {
  return useQuery({
    queryKey: ['tickets', params],
    queryFn: async () => {
      const res = await ticketApi.list(params);
      return { data: res.data.data || [], pagination: res.data.pagination };
    },
  });
}

export function useTicketDetail(id: string) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => {
      const res = await ticketApi.getById(id);
      return res.data.data || res.data;
    },
    enabled: !!id,
  });
}

export function useAssignTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, padalId }: { id: string; padalId: string }) =>
      ticketApi.assign(id, { padalId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCompleteTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ticketApi.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCancelTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, alasanBatal }: { id: string; alasanBatal?: string }) =>
      ticketApi.cancel(id, { alasanBatal }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useRejectTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, alasanTolak }: { id: string; alasanTolak: string }) =>
      ticketApi.reject(id, { alasanTolak }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
