import { useState, useEffect } from "react";
import BayRequestForm from "@/components/bay-request-form";
import StakeholderRequestList from "@/components/stakeholder-request-list";
import BayGrid from "@/components/bay-grid";
import { useBays } from "@/hooks/use-bays";
import { useRequests } from "@/hooks/use-requests";
import { useWebSocket } from "@/lib/useWebSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface StakeholderDashboardProps {
  user: {
    id: number;
    username: string;
    role: string;
    displayName: string;
  };
}

export default function StakeholderDashboard({ user }: StakeholderDashboardProps) {
  const { bays, isLoading: baysLoading } = useBays();
  const { 
    requests: apiRequests, 
    isLoading: requestsLoading, 
    createRequest: apiCreateRequest,
    deleteRequest: apiDeleteRequest,
    acceptAlternative: apiAcceptAlternative
  } = useRequests(user.id.toString());
  
  // Local state for requests that we'll update immediately
  const [requests, setRequests] = useState<any[]>([]);
  
  // Sync with API data when it changes
  useEffect(() => {
    if (apiRequests) {
      setRequests(apiRequests);
    }
  }, [apiRequests]);
  
  const { toast } = useToast();
  
  // Wrapper functions that update local state immediately
  const createRequest = async (data: any) => {
    try {
      // Update local bay state immediately
      // Find the bay that matches the requestedBayId and update its status to pending
      const updatedBays = [...bays];
      const bayIndex = updatedBays.findIndex(bay => bay.id === data.requestedBayId);
      
      if (bayIndex !== -1) {
        // Create a copy of the bay with updated status
        const updatedBay = { ...updatedBays[bayIndex], status: 'pending' as const };
        // Replace the old bay with the updated one
        updatedBays[bayIndex] = updatedBay;
        
        // Force an update to the UI 
        // We directly manipulate the DOM-related state here for immediate visual feedback
        const bayElements = document.querySelectorAll(`button[class*="bg-emerald"]`);
        bayElements.forEach(el => {
          if (el.textContent?.trim() === updatedBay.bayNumber.toString()) {
            // Update the class to change color to amber (pending)
            el.classList.remove('bg-emerald-100', 'text-emerald-900', 'border-emerald-200');
            el.classList.remove('hover:bg-emerald-200');
            el.classList.add('bg-amber-100', 'text-amber-900', 'border-amber-200', 'cursor-not-allowed', 'opacity-80');
            el.setAttribute('disabled', 'true');
          }
        });
      }
      
      // Create new request via API
      const newRequest = await apiCreateRequest(data);
      
      // Update local state immediately with the new request
      setRequests(prev => [...prev, newRequest]);
      
      return newRequest;
    } catch (error) {
      console.error("Error creating request:", error);
      throw error;
    }
  };
  
  const deleteRequest = async (id: number) => {
    try {
      // Call API
      await apiDeleteRequest(id);
      
      // Update local state immediately
      setRequests(prev => prev.filter(req => req.id !== id));
    } catch (error) {
      console.error("Error deleting request:", error);
      throw error;
    }
  };
  
  const acceptAlternative = async (requestId: number, suggestedBayId: number) => {
    try {
      // Call API
      const updatedRequest = await apiAcceptAlternative(requestId, suggestedBayId);
      
      // Update local state immediately
      setRequests(prev => prev.map(req => 
        req.id === requestId ? updatedRequest : req
      ));
      
      return updatedRequest;
    } catch (error) {
      console.error("Error accepting alternative:", error);
      throw error;
    }
  };
  
  // Store user ID and set up effect for listening to custom events
  useEffect(() => {
    console.log("Setting up stakeholder dashboard with user ID:", user.id);
    
    // Store user ID in localStorage for WebSocket notifications
    localStorage.setItem('userId', user.id.toString());
  }, [user.id]);
  
  // WebSocket connection for real-time updates
  useWebSocket({
    onMessage: (data) => {
      // Handle incoming websocket messages
      console.log("WebSocket message received in stakeholder dashboard:", data);
    }
  });
  
  // Get available bays (status === 'free')
  const availableBays = bays.filter(bay => bay.status === 'free');
  

  
  return (
    <div id="stakeholder-dashboard" role="tabpanel" aria-labelledby="stakeholder-tab" className="mt-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left column: Bay Request Form */}
        <div className="w-full md:w-1/2">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Request a Bay</CardTitle>
            </CardHeader>
            <CardContent>
              {baysLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <BayRequestForm 
                  availableBays={availableBays}
                  allBays={bays}
                  onSubmit={(data) => createRequest({
                    ...data,
                    userId: user.id.toString()
                  })}
                />
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Right column: My Requests */}
        <div className="w-full md:w-1/2">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">My Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <div className="space-y-4">
                  {Array(3).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-36 w-full" />
                  ))}
                </div>
              ) : (
                <StakeholderRequestList 
                  requests={requests}
                  onCancel={deleteRequest}
                  onAcceptAlternative={acceptAlternative}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
