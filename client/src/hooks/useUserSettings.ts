import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface UserSettings {
  id: string;
  userId: string;
  bithumbFeeRate: string;
  bithumbGrade: string;
  defaultFeeRates?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export function useUserSettings() {
  return useQuery<UserSettings>({
    queryKey: ['/api/settings'],
    enabled: true,
  });
}

export function useUpdateUserSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settings: Partial<UserSettings>) => {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error('Failed to update settings');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
  });
}