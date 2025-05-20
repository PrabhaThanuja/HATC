import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Bay } from "@shared/schema";

export function useBays() {
  const { data = [], isLoading, error } = useQuery<Bay[]>({
    queryKey: ['/api/bays'],
  });
  
  // Mutation for updating bay status
  const updateBayStatusMutation = useMutation({
    mutationFn: async ({ id, status, currentFlight }: { id: number, status: string, currentFlight?: string }) => {
      const response = await apiRequest('PATCH', `/api/bays/${id}`, { status, currentFlight });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch bays after successful update
      queryClient.invalidateQueries({ queryKey: ['/api/bays'] });
    }
  });
  
  // Mutation for freeing blocked bays (ATC only)
  const freeBayMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('PATCH', `/api/bays/${id}/free`, {});
      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch bays after successfully freeing the bay
      queryClient.invalidateQueries({ queryKey: ['/api/bays'] });
    }
  });
  
  const updateBayStatus = (id: number, status: string, currentFlight?: string) => {
    return updateBayStatusMutation.mutateAsync({ id, status, currentFlight });
  };
  
  const freeBay = (id: number) => {
    return freeBayMutation.mutateAsync(id);
  };
  
  return {
    bays: data,
    isLoading,
    error,
    updateBayStatus,
    freeBay,
    isUpdating: updateBayStatusMutation.isPending,
    isFreeing: freeBayMutation.isPending
  };
}
