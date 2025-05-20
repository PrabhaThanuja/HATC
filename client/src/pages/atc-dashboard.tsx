import { useState } from "react";
import BayGrid from "@/components/bay-grid";
import RequestList from "@/components/request-list";
import AlternativeBayModal from "@/components/alternative-bay-modal";
import { useBays } from "@/hooks/use-bays";
import { useRequests } from "@/hooks/use-requests";
import { useWebSocket } from "@/lib/useWebSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface AtcDashboardProps {
  user: {
    id: number;
    username: string;
    role: string;
    displayName: string;
  };
}

export default function AtcDashboard({ user }: AtcDashboardProps) {
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBay, setSelectedBay] = useState<any | null>(null);
  const [showFreeConfirmDialog, setShowFreeConfirmDialog] = useState(false);
  const { toast } = useToast();
  
  const { bays, isLoading: baysLoading, freeBay, isFreeing } = useBays();
  // Use the requests API
  const { 
    requests, 
    isLoading: requestsLoading, 
    approveRequest, 
    denyRequest, 
    suggestAlternative
  } = useRequests();
  
  // Filter for pending requests (null/undefined status means pending as well)
  const pendingRequests = requests.filter(r => r.status === 'pending' || !r.status);
  
  // WebSocket connection for real-time updates
  useWebSocket({
    onMessage: (data) => {
      // Handle incoming websocket messages
      console.log("WebSocket message received:", data);
    }
  });
  
  // Recent activity - build from non-pending requests
  const recentActivity = requests
    .filter(req => req.status && req.status !== 'pending')
    .sort((a, b) => new Date(b.respondedAt || 0).getTime() - new Date(a.respondedAt || 0).getTime())
    .slice(0, 5);
  
  // Handle opening the alternative bay suggestion modal
  const handleSuggestAlternative = (request: any) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };
  
  // Handle submitting the alternative bay suggestion
  const handleSubmitAlternative = (suggestedBayId: number, notes: string) => {
    if (selectedRequest) {
      suggestAlternative(selectedRequest.id, suggestedBayId, notes);
      setIsModalOpen(false);
    }
  };
  
  // Handle freeing a blocked bay
  const handleFreeBay = async () => {
    if (selectedBay) {
      try {
        await freeBay(selectedBay.id);
        toast({
          title: "Bay Freed",
          description: `Bay ${selectedBay.bayNumber} has been successfully freed up.`,
          variant: "default" // Using default for success message
        });
        setShowFreeConfirmDialog(false);
        setSelectedBay(null);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to free bay. Please try again.",
          variant: "destructive"
        });
      }
    }
  };
  
  return (
    <div id="atc-dashboard" role="tabpanel" aria-labelledby="atc-tab" className="mt-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left column: Bay Status Map */}
        <div className="w-full md:w-1/2">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Bay Status</CardTitle>
            </CardHeader>
            <CardContent>
              {baysLoading ? (
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {Array(8).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (
                <BayGrid 
                  bays={bays} 
                  onBayClick={(bay) => {
                    console.log("Bay clicked:", bay);
                    
                    // Check if it's a blocked bay that ATC can free
                    if (bay.status === 'occupied') {
                      // Set the selected bay and show confirmation dialog
                      setSelectedBay(bay);
                      setShowFreeConfirmDialog(true);
                      return;
                    }
                    
                    // Check for pending requests that match this bay
                    const matchingRequest = requests.find(r => 
                      (r.status === 'pending' || !r.status) && 
                      r.requestedBayId === bay.bayNumber
                    );
                    
                    if (matchingRequest) {
                      setSelectedRequest(matchingRequest);
                      setIsModalOpen(true);
                    } else {
                      console.log(`Bay ${bay.bayNumber} selected. Status: ${bay.status}`);
                      // For other states, just show a toast notification with bay info
                      toast({
                        title: `Bay ${bay.bayNumber}`,
                        description: `Status: ${bay.status}${bay.currentFlight ? `, Flight: ${bay.currentFlight}` : ''}`,
                        variant: "default"
                      });
                    }
                  }}
                />
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Right column: Pending Requests */}
        <div className="w-full md:w-1/2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-2xl">Pending Requests</CardTitle>
              {pendingRequests.length > 0 && (
                <div className="bg-warning text-white px-2 py-1 rounded text-xs font-semibold">
                  {pendingRequests.length} New
                </div>
              )}
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <div className="space-y-4">
                  {Array(2).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-36 w-full" />
                  ))}
                </div>
              ) : (
                <RequestList 
                  requests={pendingRequests}
                  onApprove={approveRequest}
                  onDeny={denyRequest}
                  onSuggestAlternative={handleSuggestAlternative}
                />
              )}
              
              <div className="mt-6">
                <h3 className="text-xl font-bold mb-3 text-neutral-800">Recent Activity</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {recentActivity.map(request => (
                    <div 
                      key={request.id}
                      className={`text-sm p-2 bg-neutral-100 border-l-4 ${
                        request.status === 'approved' 
                          ? 'border-success' 
                          : request.status === 'denied' 
                            ? 'border-danger' 
                            : 'border-primary'
                      }`}
                    >
                      <div className="font-medium">
                        {request.status === 'approved' && `Approved: ${request.flightCallsign} for Bay ${request.requestedBayId}`}
                        {request.status === 'denied' && `Denied: ${request.flightCallsign} for Bay ${request.requestedBayId}`}
                        {request.suggestedBayId && `Alternative: Bay ${request.suggestedBayId} suggested for ${request.flightCallsign}`}
                      </div>
                      <div className="text-neutral-500">
                        {request.respondedAt ? new Date(request.respondedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Alternative Bay Modal */}
      <AlternativeBayModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitAlternative}
        request={selectedRequest}
        availableBays={bays.filter(bay => bay.status === 'free')}
      />
      
      {/* Free Bay Confirmation Dialog */}
      <AlertDialog open={showFreeConfirmDialog} onOpenChange={setShowFreeConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Free Bay {selectedBay?.bayNumber}</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedBay && (
                <>
                  Are you sure you want to free up Bay {selectedBay.bayNumber}?
                  {selectedBay.currentFlight && (
                    <p className="mt-2">
                      This bay is currently assigned to flight <strong>{selectedBay.currentFlight}</strong>.
                    </p>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <button 
              className="px-4 py-2 border rounded-md"
              onClick={() => {
                setSelectedBay(null);
                setShowFreeConfirmDialog(false);
              }}
              disabled={isFreeing}
            >
              Cancel
            </button>
            <button 
              onClick={handleFreeBay} 
              disabled={isFreeing}
              className={`px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 ${isFreeing ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isFreeing ? 'Freeing...' : 'Free Bay'}
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
