import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Request } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useRequests(userId?: string) {
  const { toast } = useToast();
  
  // Query for fetching requests
  const queryKey = userId 
    ? ['/api/requests', { userId }] 
    : ['/api/requests'];
  
  const { data = [], isLoading, error } = useQuery<Request[]>({
    queryKey,
  });
  
  // Mutation for creating request
  const createRequestMutation = useMutation({
    mutationFn: async (requestData: any) => {
      // Immediately update the bay status to pending in the cache
      // Get the current bays data
      const currentBays = queryClient.getQueryData<any[]>(['/api/bays']) || [];
      
      // Create an updated version with the requested bay set to pending
      const updatedBays = currentBays.map(bay => 
        bay.id === requestData.requestedBayId 
          ? { ...bay, status: 'pending' } 
          : bay
      );
      
      // Update the cache immediately to reflect the pending status
      queryClient.setQueryData(['/api/bays'], updatedBays);
      
      // Make the actual API request
      const response = await apiRequest('POST', '/api/requests', requestData);
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate all request queries to ensure lists are updated
      queryClient.invalidateQueries({ queryKey: ['/api/requests'] });
      
      // If we have userId-specific queries, make sure to invalidate those too
      if (userId) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/requests', { userId }] 
        });
      }
      
      // Also invalidate bays as the bay status will change
      queryClient.invalidateQueries({ queryKey: ['/api/bays'] });
      
      // Manually update the cache with the new request to ensure immediate visibility
      if (userId) {
        const currentRequests = queryClient.getQueryData<Request[]>(['/api/requests', { userId }]) || [];
        queryClient.setQueryData(['/api/requests', { userId }], [...currentRequests, data]);
      }
      
      toast({
        title: "Success",
        description: "Request submitted successfully!",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation for approving request
  const approveRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await apiRequest('PATCH', `/api/requests/${requestId}`, { status: 'approved' });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bays'] });
      toast({
        title: "Success",
        description: "Request approved successfully!",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to approve request. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation for denying request
  const denyRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await apiRequest('PATCH', `/api/requests/${requestId}`, { status: 'denied' });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bays'] });
      toast({
        title: "Request Denied",
        description: "Request has been denied.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to deny request. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation for suggesting alternative bay
  const suggestAlternativeMutation = useMutation({
    mutationFn: async ({ requestId, suggestedBayId, notes }: { requestId: number, suggestedBayId: number, notes: string }) => {
      const response = await apiRequest('POST', `/api/requests/${requestId}/suggest`, { suggestedBayId, notes });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/requests'] });
      toast({
        title: "Success",
        description: "Alternative bay suggested successfully!",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to suggest alternative bay. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation for accepting alternative bay
  const acceptAlternativeMutation = useMutation({
    mutationFn: async ({ requestId, suggestedBayId }: { requestId: number, suggestedBayId: number }) => {
      const response = await apiRequest('PATCH', `/api/requests/${requestId}`, { 
        status: 'approved', 
        requestedBayId: suggestedBayId,
        suggestedBayId: null
      });
      return response.json();
    },
    onSuccess: (updatedRequest) => {
      // Invalidate general requests query
      queryClient.invalidateQueries({ queryKey: ['/api/requests'] });
      
      // Update the user-specific query if we have a userId
      if (userId) {
        // Get current data from the cache
        const currentRequests = queryClient.getQueryData<Request[]>(['/api/requests', { userId }]) || [];
        
        // Replace the updated request in the cache
        const updatedRequests = currentRequests.map(req => 
          req.id === updatedRequest.id ? updatedRequest : req
        );
        
        // Update the cache immediately
        queryClient.setQueryData(['/api/requests', { userId }], updatedRequests);
        
        // Still invalidate the specific query to ensure consistency
        queryClient.invalidateQueries({ 
          queryKey: ['/api/requests', { userId }] 
        });
      }
      
      // Also invalidate bays as bay status will change
      queryClient.invalidateQueries({ queryKey: ['/api/bays'] });
      
      toast({
        title: "Success",
        description: "Alternative bay accepted!",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to accept alternative bay. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation for deleting request
  const deleteRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      await apiRequest('DELETE', `/api/requests/${requestId}`);
      return requestId;
    },
    onSuccess: (deletedRequestId) => {
      // Invalidate all request queries
      queryClient.invalidateQueries({ queryKey: ['/api/requests'] });
      
      // Also update the user-specific query if we have a userId
      if (userId) {
        // Get current data from the cache
        const currentRequests = queryClient.getQueryData<Request[]>(['/api/requests', { userId }]) || [];
        
        // Filter out the deleted request
        const updatedRequests = currentRequests.filter(req => req.id !== deletedRequestId);
        
        // Update the cache immediately
        queryClient.setQueryData(['/api/requests', { userId }], updatedRequests);
        
        // Still invalidate the specific query to ensure consistency
        queryClient.invalidateQueries({ 
          queryKey: ['/api/requests', { userId }] 
        });
      }
      
      // Also invalidate bays as a bay might have changed status
      queryClient.invalidateQueries({ queryKey: ['/api/bays'] });
      
      toast({
        title: "Success",
        description: "Request cancelled successfully!",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to cancel request. Please try again.",
        variant: "destructive",
      });
    }
  });
  

  
  // Functions to expose
  const createRequest = (requestData: any) => createRequestMutation.mutateAsync(requestData);
  const approveRequest = (requestId: number) => approveRequestMutation.mutateAsync(requestId);
  const denyRequest = (requestId: number) => denyRequestMutation.mutateAsync(requestId);
  const suggestAlternative = (requestId: number, suggestedBayId: number, notes: string) => 
    suggestAlternativeMutation.mutateAsync({ requestId, suggestedBayId, notes });
  const acceptAlternative = (requestId: number, suggestedBayId: number) => 
    acceptAlternativeMutation.mutateAsync({ requestId, suggestedBayId });
  const deleteRequest = (requestId: number) => deleteRequestMutation.mutateAsync(requestId);

  
  return {
    requests: data,
    isLoading,
    error,
    createRequest,
    approveRequest,
    denyRequest,
    suggestAlternative,
    acceptAlternative,
    deleteRequest,
    isPending: createRequestMutation.isPending || 
               approveRequestMutation.isPending || 
               denyRequestMutation.isPending || 
               suggestAlternativeMutation.isPending ||
               acceptAlternativeMutation.isPending ||
               deleteRequestMutation.isPending
  };
}
